import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const configureGoogleSignIn = () => {
    GoogleSignin.configure({
        webClientId: '761562547862-va3c7kh3i04maagpookhg724qmh7r2j8.apps.googleusercontent.com',
        offlineAccess: true,
    });
};