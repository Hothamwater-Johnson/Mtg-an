#include "PluginProcessor.h"
#include "PluginEditor.h"

juce::AudioProcessorValueTreeState::ParameterLayout DistortionAudioProcessor::createParameterLayout()
{
    juce::AudioProcessorValueTreeState::ParameterLayout layout;

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID { "drive", 1 }, "Drive",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 0.5f));

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID { "tone", 1 }, "Tone",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 0.5f));

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID { "level", 1 }, "Level",
        juce::NormalisableRange<float>(-24.0f, 6.0f, 0.1f), 0.0f));

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID { "mix", 1 }, "Mix",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f), 1.0f));

    layout.add(std::make_unique<juce::AudioParameterChoice>(
        juce::ParameterID { "mode", 1 }, "Mode",
        juce::StringArray { "Soft", "Hard", "Overdrive", "Fuzz", "Fold", "Crush" },
        0));

    return layout;
}

DistortionAudioProcessor::DistortionAudioProcessor()
    : AudioProcessor(BusesProperties()
                     .withInput ("Input",  juce::AudioChannelSet::stereo(), true)
                     .withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      apvts(*this, nullptr, "Parameters", createParameterLayout())
{
}

DistortionAudioProcessor::~DistortionAudioProcessor() {}

bool DistortionAudioProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::mono()
     && layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

    return layouts.getMainInputChannelSet() == layouts.getMainOutputChannelSet();
}

void DistortionAudioProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    currentSampleRate = sampleRate;

    oversampling.initProcessing((size_t)samplesPerBlock);
    oversampling.reset();

    const auto numCh = (juce::uint32)getTotalNumInputChannels();
    juce::dsp::ProcessSpec spec { sampleRate, (juce::uint32)samplesPerBlock, numCh };

    toneFilter.prepare(spec);
    toneFilter.setType(juce::dsp::StateVariableTPTFilterType::lowpass);
    toneFilter.setCutoffFrequency(20000.0f);
    toneFilter.reset();
}

void DistortionAudioProcessor::releaseResources()
{
    oversampling.reset();
}

float DistortionAudioProcessor::applyWaveshaper(float x, int mode, float driveNorm) noexcept
{
    const float driveGain = 1.0f + driveNorm * 39.0f; // 1× – 40×

    switch (mode)
    {
        case 0: // Soft — smooth tanh saturation
            return std::tanh(x * driveGain);

        case 1: // Hard — brick-wall clip
            return juce::jlimit(-1.0f, 1.0f, x * driveGain);

        case 2: // Overdrive — asymmetric diode-style clip
        {
            const float d = x * driveGain;
            if (d >= 0.0f) return  1.0f - std::exp(-d);
            else           return -(1.0f - std::exp(d * 0.7f));
        }

        case 3: // Fuzz — extreme exp clip (near square-wave at high drive)
        {
            const float d = x * driveGain * 2.0f;
            if (d >= 0.0f) return  1.0f - std::exp(-d);
            else           return -(1.0f - std::exp(d));
        }

        case 4: // Fold — wavefolder (metallic harmonics)
        {
            float y = x * driveGain;
            for (int i = 0; i < 32 && (y > 1.0f || y < -1.0f); ++i)
            {
                if (y >  1.0f) y =  2.0f - y;
                if (y < -1.0f) y = -2.0f - y;
            }
            return y;
        }

        case 5: // Crush — bit-depth reduction (drive → fewer bits)
        {
            const int   bits = std::max(1, (int)(16.0f - driveNorm * 14.0f)); // 16 → 2
            const float q    = std::pow(2.0f, (float)(bits - 1));
            return std::round(juce::jlimit(-1.0f, 1.0f, x) * q) / q;
        }

        default:
            return std::tanh(x * driveGain);
    }
}

void DistortionAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer,
                                            juce::MidiBuffer&)
{
    juce::ScopedNoDenormals noDenormals;

    const float driveNorm = *apvts.getRawParameterValue("drive");
    const float toneNorm  = *apvts.getRawParameterValue("tone");
    const float levelDb   = *apvts.getRawParameterValue("level");
    const float mixNorm   = *apvts.getRawParameterValue("mix");
    const int   mode      = (int)*apvts.getRawParameterValue("mode");

    const int numCh      = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    // Tone: 300 Hz (dark) → 20 kHz (bright) on a log curve
    toneFilter.setCutoffFrequency(300.0f * std::pow(66.67f, toneNorm));

    // Capture dry for mix blend
    juce::AudioBuffer<float> dry(numCh, numSamples);
    dry.makeCopyOf(buffer);

    // Upsample
    juce::dsp::AudioBlock<float> block(buffer);
    auto osBlock = oversampling.processSamplesUp(block);

    // Waveshape at 4× rate (anti-aliasing)
    for (size_t ch = 0; ch < osBlock.getNumChannels(); ++ch)
    {
        auto* data = osBlock.getChannelPointer(ch);
        for (size_t i = 0; i < osBlock.getNumSamples(); ++i)
            data[i] = applyWaveshaper(data[i], mode, driveNorm);
    }

    // Downsample
    oversampling.processSamplesDown(block);

    // Tone LP filter
    {
        juce::dsp::ProcessContextReplacing<float> ctx(block);
        toneFilter.process(ctx);
    }

    // Output gain
    buffer.applyGain(juce::Decibels::decibelsToGain(levelDb));

    // Dry/wet blend
    const float wet = mixNorm;
    const float drym = 1.0f - wet;
    for (int ch = 0; ch < numCh; ++ch)
    {
        auto*       w = buffer.getWritePointer(ch);
        const auto* d = dry.getReadPointer(ch);
        for (int i = 0; i < numSamples; ++i)
            w[i] = drym * d[i] + wet * w[i];
    }
}

juce::AudioProcessorEditor* DistortionAudioProcessor::createEditor()
{
    return new DistortionAudioProcessorEditor(*this);
}

void DistortionAudioProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    auto state = apvts.copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    copyXmlToBinary(*xml, destData);
}

void DistortionAudioProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    std::unique_ptr<juce::XmlElement> xml(getXmlFromBinary(data, sizeInBytes));
    if (xml && xml->hasTagName(apvts.state.getType()))
        apvts.replaceState(juce::ValueTree::fromXml(*xml));
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new DistortionAudioProcessor();
}
