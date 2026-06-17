import {
  STUDIO_PRESETS,
  STUDIO_RANGES,
  type StudioPresetName,
  type StudioSettings,
} from "../studio/settings";

type StudioPanelOptions = {
  root: HTMLElement;
  initialSettings: StudioSettings;
  onSettingsChange: (settings: Partial<StudioSettings>) => void;
  onPreset: (preset: StudioPresetName) => void;
  onReset: () => void;
  onExport: () => string;
  onPhysicsReset: () => void;
};

type SliderBinding = {
  input: HTMLInputElement;
  output: HTMLOutputElement;
};

const SLIDER_GROUPS: Array<{
  title: string;
  sliders: Array<{
    key: keyof StudioSettings;
    label: string;
    step: string;
    suffix?: string;
  }>;
}> = [
  {
    title: "Grass Shader",
    sliders: [
      { key: "grassHeight", label: "Grass height", step: "0.01" },
      { key: "windStrength", label: "Wind strength", step: "0.01" },
      { key: "windSpeed", label: "Wind speed", step: "0.05" },
    ],
  },
  {
    title: "Sky And Clouds",
    sliders: [
      { key: "skyTurbidity", label: "Sky haze", step: "0.1" },
      { key: "cloudCoverage", label: "Cloud coverage", step: "0.01" },
      { key: "cloudDensity", label: "Cloud density", step: "0.01" },
      { key: "cloudSpeed", label: "Cloud drift", step: "0.01" },
      { key: "cloudScale", label: "Cloud scale", step: "0.1" },
      { key: "sunElevation", label: "Sun elevation", step: "1", suffix: " deg" },
      { key: "sunAzimuth", label: "Sun azimuth", step: "1", suffix: " deg" },
      { key: "exposure", label: "Exposure", step: "0.01" },
    ],
  },
  {
    title: "Post FX",
    sliders: [
      { key: "bloomStrength", label: "Bloom strength", step: "0.01" },
      { key: "bloomRadius", label: "Bloom radius", step: "0.01" },
      { key: "bloomThreshold", label: "Bloom threshold", step: "0.01" },
      { key: "filmIntensity", label: "Film grain", step: "0.01" },
      { key: "vignetteDarkness", label: "Vignette dark", step: "0.01" },
      { key: "vignetteOffset", label: "Vignette size", step: "0.01" },
      { key: "afterimageDamp", label: "Motion trail", step: "0.01" },
    ],
  },
];

const SLIDERS: Array<{
  key: keyof StudioSettings;
  label: string;
  step: string;
  suffix?: string;
}> = SLIDER_GROUPS.flatMap((group) => group.sliders);

export type StudioPanel = {
  sync: (settings: StudioSettings) => void;
};

export function createStudioPanel(options: StudioPanelOptions): StudioPanel {
  const panel = document.createElement("aside");
  panel.className = "studio-panel";
  panel.innerHTML = `
    <header class="studio-header">
      <p class="eyebrow">WebGL</p>
      <h1>AntCarts Studio</h1>
    </header>
  `;

  const bindings = new Map<keyof StudioSettings, SliderBinding>();
  const presetGroup = createSection("Presets");
  const presetButtons = document.createElement("div");
  presetButtons.className = "preset-grid";

  for (const preset of Object.keys(STUDIO_PRESETS) as StudioPresetName[]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-button";
    button.textContent = preset;
    button.addEventListener("click", () => options.onPreset(preset));
    presetButtons.append(button);
  }

  presetGroup.append(presetButtons);
  panel.append(presetGroup);

  for (const group of SLIDER_GROUPS) {
    const controlsGroup = createSection(group.title);

    for (const slider of group.sliders) {
      const binding = createSlider(slider, options.initialSettings, options.onSettingsChange);
      bindings.set(slider.key, binding);
      controlsGroup.append(binding.input.closest(".control-row") as HTMLElement);
    }

    panel.append(controlsGroup);
  }

  const actionGroup = createSection("Actions");
  const actionRow = document.createElement("div");
  actionRow.className = "action-row";
  actionRow.append(
    createButton("Reset", options.onReset),
    createButton("Export JSON", () => {
      const exported = options.onExport();
      navigator.clipboard?.writeText(exported).catch(() => undefined);
      showToast(options.root, "Settings exported");
    }),
    createButton("Reset orb", options.onPhysicsReset),
  );
  actionGroup.append(actionRow);
  panel.append(actionGroup);

  const bridgeHint = document.createElement("code");
  bridgeHint.className = "bridge-token";
  bridgeHint.textContent = "window.shaderStudio";
  panel.append(bridgeHint);

  options.root.append(panel);

  return {
    sync: (settings) => {
      for (const slider of SLIDERS) {
        const binding = bindings.get(slider.key);
        if (!binding) {
          continue;
        }
        const value = settings[slider.key];
        binding.input.value = String(value);
        binding.output.value = formatValue(value, slider.suffix);
      }
    },
  };
}

function createSection(title: string): HTMLElement {
  const section = document.createElement("section");
  section.className = "studio-section";

  const heading = document.createElement("h2");
  heading.textContent = title;
  section.append(heading);

  return section;
}

function createSlider(
  slider: (typeof SLIDERS)[number],
  settings: StudioSettings,
  onSettingsChange: (settings: Partial<StudioSettings>) => void,
): SliderBinding {
  const row = document.createElement("label");
  row.className = "control-row";

  const header = document.createElement("span");
  header.className = "control-header";

  const name = document.createElement("span");
  name.textContent = slider.label;

  const output = document.createElement("output");
  output.value = formatValue(settings[slider.key], slider.suffix);

  header.append(name, output);

  const range = STUDIO_RANGES[slider.key];
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(range.min);
  input.max = String(range.max);
  input.step = slider.step;
  input.value = String(settings[slider.key]);
  input.dataset.setting = slider.key;
  input.addEventListener("input", () => {
    const value = Number(input.value);
    output.value = formatValue(value, slider.suffix);
    onSettingsChange({ [slider.key]: value });
  });

  row.append(header, input);

  return { input, output };
}

function createButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);

  return button;
}

function formatValue(value: number, suffix = ""): string {
  const rounded = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(2);
  return `${rounded}${suffix}`;
}

function showToast(root: HTMLElement, message: string): void {
  const toast = document.createElement("div");
  toast.className = "studio-toast";
  toast.textContent = message;
  root.append(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 1700);
}
