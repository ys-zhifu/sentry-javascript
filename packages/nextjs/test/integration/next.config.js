const { withSentryConfig } = require('@sentry/nextjs');

const moduleExports = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  pageExtensions: ['jsx', 'js', 'tsx', 'ts', 'page.tsx'],
  sentry: {
    // Suppress the warning message from `handleSourcemapHidingOptionWarning` in `src/config/webpack.ts`
    // TODO (v8): This can come out in v8, because this option will get a default value
    hideSourceMaps: false,
  },
};
const SentryWebpackPluginOptions = {
  dryRun: true,
  silent: true,
};

module.exports = withSentryConfig(moduleExports, SentryWebpackPluginOptions);
