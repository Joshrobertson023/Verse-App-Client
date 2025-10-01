import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}

// export default function RootLayout() {
//   return (
//     // 1. Wrap the entire application in the AuthProvider
//     <AuthProvider>
//       <Stack>
//         {/* 2. Public Route: The signin screen. 
//           This route is accessible to everyone, including unauthenticated users.
//         */}
//         <Stack.Screen name="signin" options={{ headerShown: false }} />
        
//         {/* 3. Protected Group: The (app) folder. 
//           Any navigation to a screen inside (app) will first load (app)/_layout.tsx, 
//           which runs the authentication check and redirects if the user is not signed in.
//         */}
//         <Stack.Screen name="(app)" options={{ headerShown: false }} />
//       </Stack>
//     </AuthProvider>
//   );
// }