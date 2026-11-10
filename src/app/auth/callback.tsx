import { Redirect } from 'expo-router';
// AuthSession owns state/PKCE validation. Never exchange a code supplied to a cold deep link.
export default function AuthCallback() { return <Redirect href="/" />; }
