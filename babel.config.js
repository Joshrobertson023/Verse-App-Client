module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin', // Must be listed last
      // Note: react-native-gesture-handler doesn't need a babel plugin in Expo
      // The import at the top of _layout.tsx is sufficient
    ],
  };
};



