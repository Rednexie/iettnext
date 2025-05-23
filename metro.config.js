const { getDefaultConfig } = require('@expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  // drop “web” so native-only modules aren’t even resolved
  config.resolver.platforms = config.resolver.platforms.filter(p => p !== 'web');
  return config;
})();