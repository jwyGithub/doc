'use client';

import { useState, useEffect, useCallback, lazy, Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Lock, Loader2, AlertCircle, Clock } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { TableOfContents } from '@/components/table-of-contents';
import { extractHeadings } from '@/lib/toc';
import { ScrollArea } from '@/components/ui/scroll-area';

// 延迟加载 Markdown 渲染器
const MarkdownRenderer = lazy(() =>
    import('@/components/markdown-renderer').then(mod => ({
        default: mod.MarkdownRenderer
    }))
);

interface ShareStatus {
	id: string;
	requirePassword: boolean;
	isExpired: boolean;
	documentTitle: string;
}

interface DocumentData {
	title: string;
	content: string;
}

interface ShareStatusResponse {
	id: string;
	requirePassword: boolean;
	isExpired: boolean;
	documentTitle: string;
	error?: string;
}

interface AccessResponse {
	document?: DocumentData;
	error?: string;
	requirePassword?: boolean;
}

export default function SharePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const searchParams = useSearchParams();
    const urlPassword = searchParams.get('password');
    
    const [status, setStatus] = useState<ShareStatus | null>(null);
    const [document, setDocument] = useState<DocumentData | null>(null);
    const [password, setPassword] = useState(urlPassword || '');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isVerifying, setIsVerifying] = useState(false);
    
    // 提取文档目录
    const tocItems = document?.content ? extractHeadings(document.content) : [];

	// 加载文档内容
	const loadDocument = useCallback(
		async (pwd?: string) => {
			setIsVerifying(true);
			setError(null);

			try {
				const res = await fetch(`/api/shares/${id}/access`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ password: pwd })
				});

				const data = (await res.json()) as AccessResponse;

				if (!res.ok) {
					if (data.requirePassword) {
						setError(data.error || '密码错误');
					} else {
						setError(data.error || '访问失败');
					}
					return;
				}

				if (data.document) {
					setDocument(data.document);
				}
			} catch {
				setError('网络错误，请稍后重试');
			} finally {
				setIsVerifying(false);
			}
		},
		[id]
	);

	// 加载分享状态
	const loadStatus = useCallback(async () => {
		try {
			const res = await fetch(`/api/shares/${id}/access`);
			const data = (await res.json()) as ShareStatusResponse;

			if (!res.ok) {
				setError(data.error || '加载失败');
				return;
			}

			setStatus(data);

			// 如果不需要密码且未过期，直接获取文档
			if (!data.requirePassword && !data.isExpired) {
				await loadDocument();
			}
			// 如果需要密码且URL中有密码，自动尝试验证
			else if (data.requirePassword && !data.isExpired && urlPassword) {
				await loadDocument(urlPassword);
			}
		} catch {
			setError('网络错误，请稍后重试');
		} finally {
			setIsLoading(false);
		}
	}, [id, urlPassword, loadDocument]);

	useEffect(() => {
		loadStatus();
	}, [loadStatus]);

	// 更新页面标题
	useEffect(() => {
		if (document?.title) {
			window.document.title = document.title;
		} else if (status?.documentTitle) {
			window.document.title = status.documentTitle;
		}

		// 组件卸载时恢复默认标题
		return () => {
			window.document.title = '文档管理';
		};
	}, [document?.title, status?.documentTitle]);

    const handleSubmitPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) {
            setError('请输入访问密码');
            return;
        }
        await loadDocument(password);
    };

    // 加载中状态
    if (isLoading) {
        return (
            <div className='min-h-screen flex items-center justify-center bg-background'>
                <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
        );
    }

    // 分享不存在或已过期
    if (!status || status.isExpired) {
        return (
            <div className='min-h-screen flex items-center justify-center bg-background p-4'>
                <Card className='w-full max-w-md'>
                    <CardHeader className='text-center'>
                        <div className='mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4'>
                            {status?.isExpired ? (
                                <Clock className='h-6 w-6 text-destructive' />
                            ) : (
                                <AlertCircle className='h-6 w-6 text-destructive' />
                            )}
                        </div>
                        <CardTitle>{status?.isExpired ? '分享已过期' : '分享不存在'}</CardTitle>
                        <CardDescription>
                            {status?.isExpired ? '此分享链接已过期，请联系分享者获取新链接' : error || '此分享链接不存在或已被删除'}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    // 需要输入密码
    if (status.requirePassword && !document) {
        return (
            <div className='min-h-screen flex items-center justify-center bg-background p-4'>
                <Card className='w-full max-w-md'>
                    <CardHeader className='text-center'>
                        <div className='mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4'>
                            <Lock className='h-6 w-6 text-primary' />
                        </div>
                        <CardTitle>访问受保护的文档</CardTitle>
                        <CardDescription>&ldquo;{status.documentTitle}&rdquo; 需要密码才能访问</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmitPassword} className='space-y-4'>
                            <div className='space-y-2'>
                                <Input
                                    type='text'
                                    placeholder='请输入访问密码'
                                    value={password}
                                    onChange={e => setPassword(e.target.value.toUpperCase())}
                                    className='text-center font-mono tracking-widest text-lg'
                                    autoFocus
                                />
                                {error && <p className='text-sm text-destructive text-center'>{error}</p>}
                            </div>
                            <Button type='submit' className='w-full' disabled={isVerifying}>
                                {isVerifying ? (
                                    <>
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        验证中...
                                    </>
                                ) : (
                                    '访问文档'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

	// 显示文档内容
	if (document) {
		return (
			<div className='h-screen bg-background flex flex-col'>
				<header className='border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0'>
					<div className='flex h-14 items-center justify-between px-6'>
						<div className='flex items-center gap-3'>
							<div className='p-1.5 rounded-md bg-primary'>
								<FileText className='h-4 w-4 text-primary-foreground' />
							</div>
							<h1 className='font-semibold truncate'>{document.title}</h1>
						</div>
						<ThemeToggle />
					</div>
				</header>

				<div className='flex-1 flex overflow-hidden min-h-0'>
					{/* 左侧目录区域 */}
					{tocItems.length > 0 && (
						<aside className='w-64 border-r bg-muted/30 shrink-0 hidden lg:block'>
							<ScrollArea className='h-full'>
								<div className='p-6'>
									<TableOfContents items={tocItems} />
								</div>
							</ScrollArea>
						</aside>
					)}

					{/* 主内容区域 */}
					<main className='flex-1 overflow-y-auto min-h-0'>
						<div className='max-w-4xl mx-auto py-8 px-6'>
							{document.content ? (
								<Suspense
									fallback={
										<div className='flex items-center justify-center py-12'>
											<Loader2 className='h-6 w-6 animate-spin' />
										</div>
									}
								>
									<MarkdownRenderer content={document.content} />
								</Suspense>
							) : (
								<div className='text-center py-12 text-muted-foreground'>
									<p>此文档暂无内容</p>
								</div>
							)}
						</div>
					</main>
				</div>
			</div>
		);
	}

    return null;
}

