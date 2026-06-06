#include "PluginEditor.h"

// ─── LookAndFeel ─────────────────────────────────────────────────────────────

DistortionLookAndFeel::DistortionLookAndFeel()
{
    setColour(juce::ComboBox::backgroundColourId,              juce::Colour(0xff2d2d2d));
    setColour(juce::ComboBox::textColourId,                    juce::Colour(0xffdddddd));
    setColour(juce::ComboBox::outlineColourId,                 juce::Colour(0xff555555));
    setColour(juce::ComboBox::arrowColourId,                   juce::Colour(0xffff6b35));
    setColour(juce::PopupMenu::backgroundColourId,             juce::Colour(0xff2d2d2d));
    setColour(juce::PopupMenu::textColourId,                   juce::Colour(0xffdddddd));
    setColour(juce::PopupMenu::highlightedBackgroundColourId,  juce::Colour(0xffff6b35));
    setColour(juce::PopupMenu::highlightedTextColourId,        juce::Colour(0xffffffff));
}

void DistortionLookAndFeel::drawRotarySlider(juce::Graphics& g,
    int x, int y, int width, int height,
    float sliderPos, float startAngle, float endAngle, juce::Slider&)
{
    const float radius = (float)juce::jmin(width, height) * 0.5f - 4.0f;
    const float cx = (float)x + (float)width  * 0.5f;
    const float cy = (float)y + (float)height * 0.5f;
    const float angle = startAngle + sliderPos * (endAngle - startAngle);

    // Body
    g.setColour(juce::Colour(0xff353535));
    g.fillEllipse(cx - radius, cy - radius, radius * 2.0f, radius * 2.0f);

    // Glossy sheen
    juce::ColourGradient sheen(juce::Colour(0x22ffffff), cx - radius * 0.4f, cy - radius * 0.4f,
                               juce::Colour(0x00000000), cx + radius * 0.4f, cy + radius * 0.4f, true);
    g.setGradientFill(sheen);
    g.fillEllipse(cx - radius, cy - radius, radius * 2.0f, radius * 2.0f);

    // Background arc track
    {
        juce::Path track;
        const float r = radius - 3.0f;
        track.addArc(cx - r, cy - r, r * 2.0f, r * 2.0f, startAngle, endAngle, true);
        g.setColour(juce::Colour(0xff222222));
        g.strokePath(track, juce::PathStrokeType(2.5f,
            juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
    }

    // Value arc (orange)
    {
        juce::Path arc;
        const float r = radius - 3.0f;
        arc.addArc(cx - r, cy - r, r * 2.0f, r * 2.0f, startAngle, angle, true);
        g.setColour(juce::Colour(0xffff6b35));
        g.strokePath(arc, juce::PathStrokeType(2.5f,
            juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
    }

    // Indicator dot
    const float dotDist = radius * 0.55f;
    g.setColour(juce::Colour(0xffff6b35));
    g.fillEllipse(cx + std::sin(angle) * dotDist - 3.5f,
                  cy - std::cos(angle) * dotDist - 3.5f,
                  7.0f, 7.0f);
}

// ─── Editor ──────────────────────────────────────────────────────────────────

DistortionAudioProcessorEditor::DistortionAudioProcessorEditor(DistortionAudioProcessor& p)
    : AudioProcessorEditor(&p), proc(p),
      driveAtt(p.apvts, "drive", driveKnob.slider),
      toneAtt (p.apvts, "tone",  toneKnob.slider),
      levelAtt(p.apvts, "level", levelKnob.slider),
      mixAtt  (p.apvts, "mix",   mixKnob.slider),
      spaceAtt(p.apvts, "space", spaceKnob.slider),
      decayAtt(p.apvts, "decay", decayKnob.slider),
      driftAtt(p.apvts, "drift", driftKnob.slider),
      hazeAtt (p.apvts, "haze",  hazeKnob.slider)
{
    setLookAndFeel(&laf);

    setupKnob(driveKnob, "DRIVE");
    setupKnob(toneKnob,  "TONE");
    setupKnob(levelKnob, "LEVEL");
    setupKnob(mixKnob,   "MIX");

    setupKnob(spaceKnob, "SPACE");
    setupKnob(decayKnob, "DECAY");
    setupKnob(driftKnob, "DRIFT");
    setupKnob(hazeKnob,  "HAZE");

    for (auto& name : { "Soft", "Hard", "Overdrive", "Fuzz", "Fold", "Crush" })
        modeBox.addItem(name, modeBox.getNumItems() + 1);

    modeAtt = std::make_unique<juce::AudioProcessorValueTreeState::ComboBoxAttachment>(
        p.apvts, "mode", modeBox);

    modeLabel.setText("MODE", juce::dontSendNotification);
    modeLabel.setJustificationType(juce::Justification::centred);
    modeLabel.setColour(juce::Label::textColourId, juce::Colour(0xff555555));
    modeLabel.setFont(juce::Font("Helvetica", 10.0f, juce::Font::plain));

    addAndMakeVisible(modeBox);
    addAndMakeVisible(modeLabel);

    setSize(440, 370);
}

DistortionAudioProcessorEditor::~DistortionAudioProcessorEditor()
{
    setLookAndFeel(nullptr);
}

void DistortionAudioProcessorEditor::setupKnob(LabeledKnob& k, const juce::String& name)
{
    k.slider.setSliderStyle(juce::Slider::RotaryVerticalDrag);
    k.slider.setTextBoxStyle(juce::Slider::NoTextBox, false, 0, 0);
    k.label.setText(name, juce::dontSendNotification);
    k.label.setJustificationType(juce::Justification::centred);
    k.label.setColour(juce::Label::textColourId, juce::Colour(0xff888888));
    k.label.setFont(juce::Font("Helvetica", 10.0f, juce::Font::plain));
    addAndMakeVisible(k.slider);
    addAndMakeVisible(k.label);
}

void DistortionAudioProcessorEditor::paint(juce::Graphics& g)
{
    // Dark gradient background
    juce::ColourGradient bg(juce::Colour(0xff1a1a1a), 0.0f, 0.0f,
                            juce::Colour(0xff0a0a0a), 0.0f, (float)getHeight(), false);
    g.setGradientFill(bg);
    g.fillAll();

    const float w = (float)getWidth();

    // ── Plugin title ──────────────────────────────────────────────────────
    g.setColour(juce::Colour(0xffff6b35));
    g.setFont(juce::Font("Helvetica", 22.0f, juce::Font::bold));
    g.drawText("DRIVE", 0, 12, (int)w, 28, juce::Justification::centred);

    g.setColour(juce::Colour(0xff3a3a3a));
    g.setFont(juce::Font("Helvetica", 10.0f, juce::Font::plain));
    g.drawText("DISTORTION", 0, 36, (int)w, 16, juce::Justification::centred);

    g.setColour(juce::Colour(0xff252525));
    g.drawLine(20.0f, 57.0f, w - 20.0f, 57.0f, 1.0f);

    // ── Distortion section label ──────────────────────────────────────────
    g.setColour(juce::Colour(0xff404040));
    g.setFont(juce::Font("Helvetica", 9.0f, juce::Font::plain));
    g.drawText("DISTORTION", 20, 62, 120, 12, juce::Justification::centredLeft);

    // ── Atmosphere section ────────────────────────────────────────────────
    g.setColour(juce::Colour(0xff252525));
    g.drawLine(20.0f, 182.0f, w - 20.0f, 182.0f, 1.0f);

    // Slightly blue-grey label for the eerie atmosphere section
    g.setColour(juce::Colour(0xff4a6888));
    g.setFont(juce::Font("Helvetica", 9.0f, juce::Font::plain));
    g.drawText("ATMOSPHERE", 20, 186, 120, 12, juce::Justification::centredLeft);
}

void DistortionAudioProcessorEditor::resized()
{
    const int w        = getWidth();
    const int knobSize = 80;
    const int labelH   = 18;
    const int spacing  = w / 5;  // 88px

    auto placeKnob = [&](LabeledKnob& k, int idx, int rowY) {
        const int cx = spacing * (idx + 1);
        k.slider.setBounds(cx - knobSize / 2, rowY, knobSize, knobSize);
        k.label.setBounds (cx - 40, rowY + knobSize + 4, 80, labelH);
    };

    // Row 1 — Distortion (y=76, below "DISTORTION" section label)
    placeKnob(driveKnob, 0, 76);
    placeKnob(toneKnob,  1, 76);
    placeKnob(levelKnob, 2, 76);
    placeKnob(mixKnob,   3, 76);

    // Row 2 — Atmosphere (y=200, below separator + "ATMOSPHERE" label)
    placeKnob(spaceKnob, 0, 200);
    placeKnob(decayKnob, 1, 200);
    placeKnob(driftKnob, 2, 200);
    placeKnob(hazeKnob,  3, 200);

    // Mode selector centered below both rows
    // Row2 bottom of labels: 200 + 80 + 4 + 18 = 302; add 14px gap → 316
    const int modeY = 316;
    const int modeW = 160;
    modeLabel.setBounds(w / 2 - modeW / 2, modeY,      modeW, 18);
    modeBox.setBounds  (w / 2 - modeW / 2, modeY + 20, modeW, 28);
    // Bottom: 316 + 20 + 28 = 364 → fits in 370px
}
