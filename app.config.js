// Resolves Expo config and injects EAS project id for push tokens (expo-notifications).
// Option A — link the repo once: `npx eas-cli@latest init` (writes project id into this flow / dashboard).
// Option B — set in .env at repo root: EAS_PROJECT_ID=<uuid from https://expo.dev → Project settings>
// Option C — set `expo.extra.eas.projectId` in app.json (same uuid).
/* eslint-disable @typescript-eslint/no-require-imports */
const appJson = require('./app.json');

module.exports = () => {
  const fromEnv = process.env.EAS_PROJECT_ID?.trim();
  const fromJson = appJson.expo?.extra?.eas?.projectId?.trim?.();
  const projectId = fromEnv || fromJson;

  return {
    expo: {
      ...appJson.expo,
      extra: {
        ...(appJson.expo.extra ?? {}),
        eas: {
          ...(appJson.expo.extra?.eas ?? {}),
          ...(projectId ? { projectId } : {}),
        },
      },
    },
  };
};
