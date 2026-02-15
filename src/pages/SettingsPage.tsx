import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Separator } from '@/shared/ui/ui/separator';
import { Switch } from '@/shared/ui/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import {
    Bell,
    CheckCircle2,
    Globe,
    Keyboard,
    Languages,
    LogOut,
    Monitor,
    Moon,
    Palette,
    Settings,
    Sun,
    User
} from 'lucide-react';
import { useTheme } from 'next-themes';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
// Reuse existing branding component
import CompanyBrandingSettings from '@/components/settings/CompanyBrandingSettings';
import { KeyboardShortcutsPanel } from '@/components/settings/KeyboardShortcutsPanel';
import { toast } from 'sonner';

/**
 * Gold Tier Settings Page
 * Comprehensive preferences center matching the Studio Architecture aesthetics.
 */
export const SettingsPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { user, signOut, updateProfile } = useAuth();
    const { theme, setTheme } = useTheme();
    const [isLoading, setIsLoading] = useState(false);
    
    // Draft state for form inputs
    const [draftName, setDraftName] = useState('');

    // Mock state for notifications (would be connected to backend)
    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        productionUrl: false,
        marketing: false
    });

    const handleSaveProfile = async () => {
        if (!draftName && !user?.full_name) return; // Nothing to save
        
        setIsLoading(true);
        try {
            await updateProfile({
                full_name: draftName || user?.full_name || ''
            });
            toast.success("Profile updated successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update profile");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLanguageChange = (lang: string) => {
        i18n.changeLanguage(lang);
        toast.success(`Language switched to ${lang === 'en' ? 'English' : 'Arabic'}`);
    };



    return (
        <div className="min-h-screen bg-[#0a0a0a] text-slate-200">
            {/* Header with Gold Tier Gradient */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border-b border-amber-500/10 pt-20 pb-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <Settings className="h-8 w-8 text-amber-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-500">
                                {t('settings.title', 'Settings & Preferences')}
                            </h1>
                            <p className="text-slate-400 mt-1">
                                {t('settings.subtitle', 'Manage your account, appearance, and workspace configuration')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs defaultValue="general" className="space-y-8">
                    {/* Navigation Tabs */}
                    <TabsList className="bg-slate-900/50 border border-slate-800 p-1 rounded-xl h-auto flex-wrap">
                        <TabsTrigger value="general" className="px-6 py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg transition-all">
                            <Monitor className="h-4 w-4 mr-2" />
                            General
                        </TabsTrigger>
                        <TabsTrigger value="account" className="px-6 py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg transition-all">
                            <User className="h-4 w-4 mr-2" />
                            Account
                        </TabsTrigger>
                        <TabsTrigger value="branding" className="px-6 py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg transition-all">
                            <Palette className="h-4 w-4 mr-2" />
                            Branding
                        </TabsTrigger>
                        <TabsTrigger value="keyboard" className="px-6 py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg transition-all">
                            <Keyboard className="h-4 w-4 mr-2" />
                            Keyboard
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="px-6 py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg transition-all">
                            <Bell className="h-4 w-4 mr-2" />
                            Notifications
                        </TabsTrigger>
                        <TabsTrigger value="integrations" className="px-6 py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg transition-all">
                            <Globe className="h-4 w-4 mr-2" />
                            Integrations
                        </TabsTrigger>
                    </TabsList>

                    {/* GENERAL TAB */}
                    <TabsContent value="general" className="space-y-6">
                        <Card className="bg-slate-900/50 border-slate-800 card-premium">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Monitor className="h-5 w-5 text-amber-500" />
                                    Appearance
                                </CardTitle>
                                <CardDescription>Customize how Fabricator Pro looks on your device</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <button 
                                        onClick={() => setTheme('light')}
                                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'light' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 hover:border-slate-700'}`}
                                    >
                                        <Sun className="h-8 w-8 text-amber-500" />
                                        <span className="font-medium">Light</span>
                                    </button>
                                    <button 
                                        onClick={() => setTheme('dark')}
                                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'dark' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 hover:border-slate-700'}`}
                                    >
                                        <Moon className="h-8 w-8 text-amber-400" />
                                        <span className="font-medium">Dark</span>
                                    </button>
                                    <button 
                                        onClick={() => setTheme('system')}
                                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'system' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 hover:border-slate-700'}`}
                                    >
                                        <Monitor className="h-8 w-8 text-blue-400" />
                                        <span className="font-medium">System</span>
                                    </button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900/50 border-slate-800 card-premium">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Languages className="h-5 w-5 text-amber-500" />
                                    Language & Region
                                </CardTitle>
                                <CardDescription>Manage your preferred language and regional formats</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">EN</div>
                                        <div>
                                            <div className="font-medium">English (US)</div>
                                            <div className="text-sm text-slate-400">Default for interface</div>
                                        </div>
                                    </div>
                                    <Button 
                                        variant={i18n.language === 'en' ? 'default' : 'outline'}
                                        onClick={() => handleLanguageChange('en')}
                                        className={i18n.language === 'en' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                                    >
                                        {i18n.language === 'en' && <CheckCircle2 className="h-4 w-4 mr-2" />}
                                        Select
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">ع</div>
                                        <div>
                                            <div className="font-medium">العربية (Arabic)</div>
                                            <div className="text-sm text-slate-400">RTL Layout & Formats</div>
                                        </div>
                                    </div>
                                    <Button 
                                        variant={i18n.language === 'ar' ? 'default' : 'outline'}
                                        onClick={() => handleLanguageChange('ar')}
                                        className={i18n.language === 'ar' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                                    >
                                       {i18n.language === 'ar' && <CheckCircle2 className="h-4 w-4 mr-2" />}
                                        Select
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ACCOUNT TAB */}
                    <TabsContent value="account" className="space-y-6">
                        <Card className="bg-slate-900/50 border-slate-800 card-premium">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-amber-500" />
                                    Profile Information
                                </CardTitle>
                                <CardDescription>Update your personal information and contact details</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-6">
                                    <div className="h-24 w-24 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
                                        <User className="h-12 w-12 text-amber-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-semibold">{user?.full_name || user?.email || 'User Name'}</h3>
                                        <div className="flex gap-2">
                                            <Badge variant="outline" className="border-amber-500/30 text-amber-400">{user?.role || 'Operator'}</Badge>
                                            <Badge variant="outline" className="border-green-500/30 text-green-400">Active</Badge>
                                        </div>
                                    </div>
                                </div>
                                <Separator className="bg-slate-800" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Email Address</Label>
                                        <Input value={user?.email || ''} disabled className="bg-slate-950 border-slate-800" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Full Name</Label>
                                        <Input 
                                            placeholder="Enter your full name" 
                                            defaultValue={user?.full_name || ''}
                                            className="bg-slate-950 border-slate-800" 
                                            onChange={(e) => setDraftName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={handleSaveProfile} disabled={isLoading} className="bg-amber-600 hover:bg-amber-700 text-white">
                                        {isLoading ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900/50 border-slate-800 card-premium">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-red-400">
                                    <LogOut className="h-5 w-5" />
                                    Danger Zone
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-slate-200">Sign Out</div>
                                    <div className="text-sm text-slate-400">Log out of your account on all devices</div>
                                </div>
                                <Button variant="destructive" onClick={() => signOut()}>
                                    Sign Out
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* BRANDING TAB */}
                    <TabsContent value="branding">
                        {/* Reusing existing component but wrapped in a clean container */}
                        <div className="bg-slate-900/30 rounded-xl">
                            <CompanyBrandingSettings />
                        </div>
                    </TabsContent>

                    {/* KEYBOARD TAB */}
                    <TabsContent value="keyboard">
                         <Card className="bg-slate-900/50 border-slate-800 card-premium overflow-hidden h-[600px]">
                            <KeyboardShortcutsPanel />
                        </Card>
                    </TabsContent>

                    {/* INTEGRATIONS TAB */}
                    <TabsContent value="integrations" className="space-y-6">
                         <Card className="bg-slate-900/50 border-slate-800 card-premium">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-amber-500" />
                                    Connected Services
                                </CardTitle>
                                <CardDescription>Manage connections to external ERP and CRM systems</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-amber-900/20 flex items-center justify-center font-bold text-amber-400">O</div>
                                        <div>
                                            <div className="font-medium">Odoo ERP</div>
                                            <div className="text-sm text-slate-400">Sync Inventory & Invoices</div>
                                        </div>
                                    </div>
                                    <Switch />
                                </div>
                                
                                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-blue-900/20 flex items-center justify-center font-bold text-blue-400">S</div>
                                        <div>
                                            <div className="font-medium">SAP Connect</div>
                                            <div className="text-sm text-slate-400">Enterprise Resource Planning</div>
                                        </div>
                                    </div>
                                    <Switch />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-green-900/20 flex items-center justify-center font-bold text-green-400">W</div>
                                        <div>
                                            <div className="font-medium">WhatsApp Business</div>
                                            <div className="text-sm text-slate-400">Automated Client Updates</div>
                                        </div>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                     {/* NOTIFICATIONS TAB */}
                     <TabsContent value="notifications" className="space-y-6">
                        <Card className="bg-slate-900/50 border-slate-800 card-premium">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Bell className="h-5 w-5 text-amber-500" />
                                    Alert Preferences
                                </CardTitle>
                                <CardDescription>Control what you get notified about</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Email Notifications</Label>
                                        <p className="text-sm text-slate-400">Receive daily summaries and critical alerts via email</p>
                                    </div>
                                    <Switch 
                                        checked={notifications.email} 
                                        onCheckedChange={(c) => setNotifications({...notifications, email: c})}
                                    />
                                </div>
                                <Separator className="bg-slate-800" />
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Push Notifications</Label>
                                        <p className="text-sm text-slate-400">Real-time alerts on your desktop</p>
                                    </div>
                                    <Switch 
                                        checked={notifications.push} 
                                        onCheckedChange={(c) => setNotifications({...notifications, push: c})}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};
