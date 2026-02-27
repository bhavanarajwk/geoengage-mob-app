import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Alert,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Button, Card, Divider, List } from 'react-native-paper';
import auth from '@react-native-firebase/auth';
import { signOut } from '../services/AuthService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ProfileScreen({ navigation }) {
    const user = auth().currentUser;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    // Animate profile on mount
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);
    
    const handleSignOut = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                            // onAuthStateChanged in AppNavigator handles navigation
                        } catch (error) {
                            Alert.alert('Sign-Out Failed', error.message);
                        }
                    },
                },
            ],
        );
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(parseInt(timestamp));
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={styles.backBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon name="arrow-left" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    }}
                >
                    {/* Profile Picture & Name */}
                    <View style={styles.profileSection}>
                        {user?.photoURL ? (
                            <Avatar.Image 
                                size={100} 
                                source={{ uri: user.photoURL }} 
                                style={styles.avatar}
                            />
                        ) : (
                            <Avatar.Text 
                                size={100} 
                                label={user?.displayName?.split(' ').map(n => n[0]).join('') || 'U'} 
                                style={styles.avatar}
                                color="#ffffff"
                            />
                        )}
                        
                        <Text style={styles.displayName}>
                            {user?.displayName || 'User'}
                        </Text>
                        <Text style={styles.email}>{user?.email}</Text>
                    </View>

                {/* Account Information Card */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text style={styles.cardTitle}>Account Information</Text>
                        <Divider style={styles.divider} />
                        
                        <List.Item
                            title="User ID"
                            description={user?.uid}
                            left={props => <Icon name="identifier" {...props} size={24} color="#a8a8b3" />}
                            titleStyle={styles.listTitle}
                            descriptionStyle={styles.listDescription}
                            descriptionNumberOfLines={2}
                        />
                        
                        <List.Item
                            title="Email Verified"
                            description={user?.emailVerified ? 'Yes' : 'No'}
                            left={props => <Icon name={user?.emailVerified ? "check-circle" : "alert-circle"} {...props} size={24} color={user?.emailVerified ? "#22c55e" : "#fbbf24"} />}
                            titleStyle={styles.listTitle}
                            descriptionStyle={styles.listDescription}
                        />
                        
                        <List.Item
                            title="Account Created"
                            description={formatDate(user?.metadata?.creationTime)}
                            left={props => <Icon name="calendar" {...props} size={24} color="#a8a8b3" />}
                            titleStyle={styles.listTitle}
                            descriptionStyle={styles.listDescription}
                        />
                        
                        <List.Item
                            title="Last Sign In"
                            description={formatDate(user?.metadata?.lastSignInTime)}
                            left={props => <Icon name="clock-outline" {...props} size={24} color="#a8a8b3" />}
                            titleStyle={styles.listTitle}
                            descriptionStyle={styles.listDescription}
                        />
                    </Card.Content>
                </Card>

                {/* App Information Card */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text style={styles.cardTitle}>App Information</Text>
                        <Divider style={styles.divider} />
                        
                        <List.Item
                            title="Version"
                            description="1.0.0"
                            left={props => <Icon name="information" {...props} size={24} color="#a8a8b3" />}
                            titleStyle={styles.listTitle}
                            descriptionStyle={styles.listDescription}
                        />
                        
                        <List.Item
                            title="Build"
                            description="Phase 1 - MVP"
                            left={props => <Icon name="package-variant" {...props} size={24} color="#a8a8b3" />}
                            titleStyle={styles.listTitle}
                            descriptionStyle={styles.listDescription}
                        />
                    </Card.Content>
                </Card>

                    {/* Sign Out Button */}
                    <Button
                        mode="contained"
                        onPress={handleSignOut}
                        icon="logout"
                        buttonColor="#dc2626"
                        textColor="#ffffff"
                        style={styles.signOutButton}
                        contentStyle={styles.signOutButtonContent}
                        labelStyle={styles.signOutButtonLabel}
                        rippleColor="rgba(255, 255, 255, 0.2)"
                    >
                        Sign Out
                    </Button>

                    {/* Bottom Spacing */}
                    <View style={styles.bottomSpacer} />
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#0f3460',
    },
    backBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
    },
    headerSpacer: {
        width: 36,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    avatar: {
        backgroundColor: '#0f3460',
        marginBottom: 16,
    },
    displayName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: '#a8a8b3',
    },
    card: {
        backgroundColor: '#0f3460',
        marginBottom: 16,
        borderRadius: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 8,
    },
    divider: {
        backgroundColor: '#1e3a5f',
        marginBottom: 8,
    },
    listTitle: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
    },
    listDescription: {
        color: '#a8a8b3',
        fontSize: 12,
    },
    signOutButton: {
        marginTop: 8,
        marginBottom: 16,
        borderRadius: 12,
    },
    signOutButtonContent: {
        paddingVertical: 8,
    },
    signOutButtonLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    bottomSpacer: {
        height: 24,
    },
});
