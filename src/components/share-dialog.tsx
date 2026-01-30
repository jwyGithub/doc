'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, RefreshCw, Loader2, Check, Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface ShareDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    documentId: string;
    documentTitle: string;
}

interface ShareInfo {
    id: string;
    password: string | null;
    expiresAt: Date | null;
}

interface GetShareResponse {
    share?: ShareInfo;
    error?: string;
}

interface CreateShareResponse {
    share?: ShareInfo;
    updated?: boolean;
    error?: string;
}

export function ShareDialog({ open, onOpenChange, documentId, documentTitle }: ShareDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
    const [usePassword, setUsePassword] = useState(false);
    const [password, setPassword] = useState('');
    const [expiresType, setExpiresType] = useState<string>('never');
    const [copied, setCopied] = useState(false);

    // 生成随机4位密码
    const generatePassword = useCallback(() => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(result);
    }, []);

    // 加载现有分享信息
    const loadShareInfo = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/shares/document/${documentId}`);
            const data = (await res.json()) as GetShareResponse;

            if (data.share) {
                setShareInfo(data.share);
                setUsePassword(!!data.share.password);
                setPassword(data.share.password || '');

                // 计算过期类型
                if (data.share.expiresAt) {
                    const expiresAt = new Date(data.share.expiresAt);
                    const now = new Date();
                    const diffHours = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));

                    if (diffHours <= 1) setExpiresType('1h');
                    else if (diffHours <= 24) setExpiresType('1d');
                    else if (diffHours <= 168) setExpiresType('7d');
                    else if (diffHours <= 720) setExpiresType('30d');
                    else setExpiresType('never');
                } else {
                    setExpiresType('never');
                }
            } else {
                setShareInfo(null);
                setUsePassword(false);
                setPassword('');
                setExpiresType('never');
            }
        } catch {
            toast.error('加载分享信息失败');
        } finally {
            setIsLoading(false);
        }
    }, [documentId]);

    useEffect(() => {
        if (open) {
            loadShareInfo();
        }
    }, [open, loadShareInfo]);

    // 计算过期时间
    const getExpiresAt = (): string | undefined => {
        if (expiresType === 'never') return undefined;

        const now = new Date();
        switch (expiresType) {
            case '1h':
                now.setHours(now.getHours() + 1);
                break;
            case '1d':
                now.setDate(now.getDate() + 1);
                break;
            case '7d':
                now.setDate(now.getDate() + 7);
                break;
            case '30d':
                now.setDate(now.getDate() + 30);
                break;
        }
        return now.toISOString();
    };

    // 创建或更新分享
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/shares', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentId,
                    password: usePassword ? password : undefined,
                    expiresAt: getExpiresAt()
                })
            });

            const data = (await res.json()) as CreateShareResponse;

            if (!res.ok) {
                throw new Error(data.error || '创建分享失败');
            }

            if (data.share) {
                setShareInfo(data.share);
            }
            toast.success(data.updated ? '分享设置已更新' : '分享链接已创建');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '操作失败');
        } finally {
            setIsSaving(false);
        }
    };

    // 复制分享链接
    const handleCopy = async () => {
        if (!shareInfo) return;

        const shareUrl = getShareUrl();
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success('链接已复制到剪贴板');
        setTimeout(() => setCopied(false), 2000);
    };

    // 获取分享链接
    const getShareUrl = () => {
        if (!shareInfo) return '';
        let url = `${window.location.origin}/share/${shareInfo.id}`;
        if (shareInfo.password) {
            url += `?password=${encodeURIComponent(shareInfo.password)}`;
        }
        return url;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-lg'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        <Link2 className='h-5 w-5' />
                        分享文档
                    </DialogTitle>
                    <DialogDescription>分享 &ldquo;{documentTitle}&rdquo; 给其他人访问</DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className='flex items-center justify-center py-8'>
                        <Loader2 className='h-6 w-6 animate-spin' />
                    </div>
                ) : (
                    <div className='space-y-5 py-2'>
                        {/* 有效期设置 */}
                        <div className='space-y-2'>
                            <Label htmlFor='expires-select' className='text-base'>
                                有效期
                            </Label>
                            <Select value={expiresType} onValueChange={setExpiresType}>
                                <SelectTrigger id='expires-select'>
                                    <SelectValue placeholder='选择有效期' />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='1h'>1 小时</SelectItem>
                                    <SelectItem value='1d'>1 天</SelectItem>
                                    <SelectItem value='7d'>7 天</SelectItem>
                                    <SelectItem value='30d'>30 天</SelectItem>
                                    <SelectItem value='never'>永不过期</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 密码设置 */}
                        <div className='space-y-3'>
                            <div className='flex items-center justify-between'>
                                <Label htmlFor='use-password' className='text-base'>
                                    访问密码
                                </Label>
                                <Switch
                                    id='use-password'
                                    checked={usePassword}
                                    onCheckedChange={checked => {
                                        setUsePassword(checked);
                                        if (checked && !password) {
                                            generatePassword();
                                        }
                                    }}
                                />
                            </div>

                            {usePassword && (
                                <div className='flex gap-2'>
                                    <Input
                                        value={password}
                                        onChange={e => setPassword(e.target.value.toUpperCase().slice(0, 8))}
                                        placeholder='输入访问密码'
                                        className='flex-1 font-mono tracking-widest text-lg h-11'
                                    />
                                    <Button
                                        variant='outline'
                                        size='icon'
                                        className='h-11 w-11'
                                        onClick={generatePassword}
                                        title='随机生成密码'
                                    >
                                        <RefreshCw className='h-5 w-5' />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* 分享链接显示 */}
                        {shareInfo && (
                            <div className='space-y-2 pt-2 border-t'>
                                <Label className='text-base'>分享链接</Label>
                                <div className='flex gap-2'>
                                    <Input value={getShareUrl()} readOnly className='flex-1 text-sm bg-muted' />
                                    <Button variant='outline' size='icon' className='h-10 w-10' onClick={handleCopy}>
                                        {copied ? <Check className='h-4 w-4 text-green-500' /> : <Copy className='h-4 w-4' />}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter className='gap-2 sm:gap-0'>
                    <Button className='mr-2' variant='outline' onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading || isSaving}>
                        {isSaving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                        {shareInfo ? '更新分享' : '创建分享'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

