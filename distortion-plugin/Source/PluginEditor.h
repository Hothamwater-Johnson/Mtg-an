#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "PluginProcessor.h"

class DistortionLookAndFeel final : public juce::LookAndFeel_V4
{
public:
    DistortionLookAndFeel();

    void drawRotarySlider(juce::Graphics&, int x, int y, int width, int height,
                          float sliderPos, float rotaryStartAngle, float rotaryEndAngle,
                          juce::Slider&) override;
};

struct LabeledKnob
{
    juce::Slider slider;
    juce::Label  label;
};

class DistortionAudioProcessorEditor final : public juce::AudioProcessorEditor
{
public:
    explicit DistortionAudioProcessorEditor(DistortionAudioProcessor&);
    ~DistortionAudioProcessorEditor() override;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    DistortionAudioProcessor& proc;
    DistortionLookAndFeel laf;

    LabeledKnob driveKnob, toneKnob, levelKnob, mixKnob;
    juce::ComboBox modeBox;
    juce::Label    modeLabel;

    juce::AudioProcessorValueTreeState::SliderAttachment driveAtt, toneAtt, levelAtt, mixAtt;
    // Created after items are added to modeBox
    std::unique_ptr<juce::AudioProcessorValueTreeState::ComboBoxAttachment> modeAtt;

    void setupKnob(LabeledKnob&, const juce::String& name);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(DistortionAudioProcessorEditor)
};
