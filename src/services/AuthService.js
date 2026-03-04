import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { configureGoogleSignIn } from '../config/googleAuth';

// Call once at app startup (in App.tsx)
export { configureGoogleSignIn };

export const signInWithGoogle = async () => {
    const TIMEOUT_MS = 60000; // 60 seconds
    
    const signInPromise = (async () => {
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
    })();
    
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Sign-in timed out. Please try again.')), TIMEOUT_MS);
    });
    
    return Promise.race([signInPromise, timeoutPromise]);
};

export const signOut = async () => {
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
    await auth().signOut();
};

export const getCurrentUser = () => auth().currentUser;

export const getIdToken = async (retries = 3) => {
    const user = auth().currentUser;
    if (!user) {
        throw new Error('No authenticated user');
    }
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // force: true refreshes the token if expired
            return await user.getIdToken(true);
        } catch (error) {
            console.error(`[AuthService] Token refresh attempt ${attempt}/${retries} failed:`, error);
            
            if (attempt === retries) {
                throw new Error(`Failed to refresh token after ${retries} attempts: ${error.message}`);
            }
            
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`[AuthService] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};
