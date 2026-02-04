'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Loader2, UserPlus } from 'lucide-react';
import { useSettings } from '@/hooks/use-settings';
import { APP_INFO } from '@/constants';

export default function SettingsPage() {
    const router = useRouter();
    const { allowRegistration, loading, saving, loadSettings, updateRegistration } = useSettings();

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const handleToggle = async (checked: boolean) => {
        try {
            await updateRegistration(checked);
        } catch {
            // Error handled in hook
        }
    };

    return (
        <div className='flex flex-col h-full'>
            <header className='flex h-14 items-center gap-4 border-b px-6'>
                <SidebarTrigger />
                <Settings className='h-5 w-5' />
                <h1 className='font-semibold'>系统设置</h1>
            </header>

            <main className='flex-1 overflow-auto p-6'>
                <div className='max-w-2xl mx-auto space-y-6 animate-in fade-in-50 duration-300'>
                    {loading ? (
                        <Card>
                            <CardHeader>
                                <Skeleton className='h-6 w-32' />
                                <Skeleton className='h-4 w-48 mt-2' />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className='h-10 w-full' />
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle className='flex items-center gap-2'>
                                    <UserPlus className='h-5 w-5' />
                                    用户注册设置
                                </CardTitle>
                                <CardDescription>控制是否允许新用户注册账户</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className='flex items-center justify-between'>
                                    <div className='space-y-0.5'>
                                        <Label htmlFor='allow-registration'>允许用户注册</Label>
                                        <p className='text-sm text-muted-foreground'>
                                            {allowRegistration ? '当前允许新用户注册' : '当前禁止新用户注册'}
                                        </p>
                                    </div>
                                    <div className='flex items-center gap-2'>
                                        {saving && <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />}
                                        <Switch
                                            id='allow-registration'
                                            checked={allowRegistration}
                                            onCheckedChange={handleToggle}
                                            disabled={saving}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>关于系统</CardTitle>
                            <CardDescription>文档管理系统信息</CardDescription>
                        </CardHeader>
                        <CardContent className='space-y-2 text-sm'>
                            <div className='flex justify-between'>
                                <span className='text-muted-foreground'>版本</span>
                                <span>{APP_INFO.VERSION}</span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-muted-foreground'>技术栈</span>
                                <span>{APP_INFO.TECH_STACK}</span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-muted-foreground'>超级管理员账号</span>
                                <span>{APP_INFO.SUPER_ADMIN_EMAIL}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}

