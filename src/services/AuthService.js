import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { configureGoogleSignIn } from '../config/googleAuth';

// Call once at app startup (in App.tsx)
export { configureGoogleSignIn };

export const signInWithGoogle = async () => {
    // Ensure Google Play Services are available
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Trigger the Google Sign-In flow
    const signInResult = await GoogleSignin.signIn();

    // Get ID token from result
    const idToken = signInResult.data?.idToken ?? signInResult.idToken;
    if (!idToken) {
        throw new Error('Google Sign-In failed: no idToken returned');
    }

    // Create Firebase credential from Google ID token
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);

    // Sign in to Firebase with Google credential
    const userCredential = await auth().signInWithCredential(googleCredential);

    // Get Firebase ID token (sent to backend in Authorization header)
    const firebaseIdToken = await userCredential.user.getIdToken();

    return { user: userCredential.user, firebaseIdToken };
};

export const signOut = async () => {
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
    await auth().signOut();
};

export const getCurrentUser = () => auth().currentUser;

export const getIdToken = async () => {
    const user = auth().currentUser;
    if (!user) {
        throw new Error('No authenticated user');
    }
    // force: true refreshes the token if expired
    return user.getIdToken(true);
};
