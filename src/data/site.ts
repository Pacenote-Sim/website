export const site = {
  name: 'Pacenote',
  url: 'https://www.pacenote.tech',
  tagline: 'Sim racing telemetry you host yourself.',
  github: 'https://github.com/Pacenote-Sim',
  releases: 'https://github.com/Pacenote-Sim/server/releases',
  issues: 'https://github.com/Pacenote-Sim/server/issues',
};

export const repos = {
  server: 'https://github.com/Pacenote-Sim/server',
  client: 'https://github.com/Pacenote-Sim/client',
  protocol: 'https://github.com/Pacenote-Sim/protocol',
  plugin: 'https://github.com/Pacenote-Sim/plugin',
  clientplugin: 'https://github.com/Pacenote-Sim/clientplugin',
  engineer: 'https://github.com/Pacenote-Sim/engineer',
  voice: 'https://github.com/Pacenote-Sim/voice',
  visualTelemetry: 'https://github.com/Pacenote-Sim/visual-telemetry',
  clientIracing: 'https://github.com/Pacenote-Sim/client-iracing',
  clientEngineer: 'https://github.com/Pacenote-Sim/client-engineer',
  clientVoice: 'https://github.com/Pacenote-Sim/client-voice',
  clientVisualTelemetry: 'https://github.com/Pacenote-Sim/client-visual-telemetry',
};

const FALLBACK_VERSION = '0.2.0';

/** The latest server release, read from GitHub at build time. Falls back when offline. */
export async function latestServerVersion(): Promise<string> {
  try {
    const res = await fetch('https://api.github.com/repos/Pacenote-Sim/server/releases/latest', {
      headers: { Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return FALLBACK_VERSION;
    const data = (await res.json()) as { tag_name?: string };
    return data.tag_name?.replace(/^v/, '') ?? FALLBACK_VERSION;
  } catch {
    return FALLBACK_VERSION;
  }
}
