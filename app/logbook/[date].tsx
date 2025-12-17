// This file is deprecated - logbook entries are now managed through category screens
// Redirect to main logbook screen
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function LogbookDateRedirect() {
    const router = useRouter();
    
    useEffect(() => {
        router.replace('/(tabs)/logbook' as any);
    }, []);
    
    return null;
}
