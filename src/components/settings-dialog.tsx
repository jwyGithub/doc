'use client';

import { useEffect, useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [allowRegistration, setAllowRegistration] = useState(true);

    const fetchSettings = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/settings/registration');
            const data = (await res.json()) as { allowed: boolean };
            setAllowRegistration(data.allowed);
        } catch (error) {
            console.error(error);
            toast.error('获取设置失败');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            fetchSettings();
        }
    }, [open, fetchSettings]);

    const handleToggleRegistration = async (checked: boolean) => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings/registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ allowed: checked })
            });

            if (!res.ok) {
                const data = (await res.json()) as { error?: string };
                throw new Error(data.error || '保存失败');
            }

            setAllowRegistration(checked);
            toast.success(checked ? '已开启用户注册' : '已关闭用户注册');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '保存失败');
            setAllowRegistration(!checked);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='!w-[60vw] !max-w-[90vw] max-h-[80vh] !min-h-[60vh] flex flex-col'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        <Settings className='h-5 w-5' />
                        系统设置
                    </DialogTitle>
                    <DialogDescription>管理系统配置和参数</DialogDescription>
                </DialogHeader>

                <ScrollArea className='max-h-[60vh]'>
                    <div className='space-y-4 pr-4'>
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
                                <CardHeader className='pb-3'>
                                    <CardTitle className='flex items-center gap-2 text-base'>
                                        <UserPlus className='h-4 w-4' />
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
                                                onCheckedChange={handleToggleRegistration}
                                                disabled={saving}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader className='pb-3'>
                                <CardTitle className='text-base'>关于系统</CardTitle>
                                <CardDescription>文档管理系统信息</CardDescription>
                            </CardHeader>
                            <CardContent className='space-y-2 text-sm'>
                                <div className='flex justify-between'>
                                    <span className='text-muted-foreground'>版本</span>
                                    <span>1.0.0</span>
                                </div>
                                <div className='flex justify-between'>
                                    <span className='text-muted-foreground'>技术栈</span>
                                    <span>Next.js + Cloudflare D1</span>
                                </div>
                                <div className='flex justify-between'>
                                    <span className='text-muted-foreground'>超级管理员账号</span>
                                    <span>admin@doc.local</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

