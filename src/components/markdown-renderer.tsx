"use client";

import { useState, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import "highlight.js/styles/github-dark.css";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { rehypeHeadingTree } from "@/lib/rehype-heading-tree";

// 复制按钮组件
function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [text]);

	return (
		<button
			onClick={handleCopy}
			className={cn(
				"absolute top-2 right-2 p-1.5 rounded-md transition-all",
				"bg-white/10 hover:bg-white/20 text-white/70 hover:text-white",
				"opacity-0 group-hover:opacity-100",
				copied && "opacity-100 text-green-400"
			)}
			title={copied ? "已复制" : "复制代码"}
		>
			{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
		</button>
	);
}

interface MarkdownRendererProps {
	content: string;
	className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
	// 创建自定义组件
	const components = useMemo(() => ({
			// 自定义链接在新标签页打开外部链接
			a: ({ href, children, ...props }: React.HTMLAttributes<HTMLAnchorElement> & { href?: string }) => {
				const isExternal = href?.startsWith("http");
				return (
					<a
						href={href}
						target={isExternal ? "_blank" : undefined}
						rel={isExternal ? "noopener noreferrer" : undefined}
						{...props}
					>
						{children}
					</a>
				);
			},
			// 自定义代码块 - 添加复制按钮
			pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => {
				// 提取代码文本
				const getCodeText = (node: React.ReactNode): string => {
					if (typeof node === "string") return node;
					if (Array.isArray(node)) return node.map(getCodeText).join("");
					if (node && typeof node === "object" && "props" in node) {
						const element = node as { props: { children?: React.ReactNode } };
						return getCodeText(element.props.children);
					}
					return "";
				};
				const codeText = getCodeText(children);

				return (
					<pre className="relative group" {...props}>
						{children}
						{codeText && <CopyButton text={codeText} />}
					</pre>
				);
			},
	}), []);

	return (
		<div
			className={cn(
				"prose prose-neutral dark:prose-invert max-w-none",
				"prose-headings:scroll-mt-24",
				// 标题样式 - 暗色模式使用渐变色
				"prose-h1:text-3xl prose-h1:font-bold prose-h1:border-b prose-h1:pb-2 prose-h1:border-border",
				"dark:prose-h1:text-transparent dark:prose-h1:bg-clip-text dark:prose-h1:bg-gradient-to-r dark:prose-h1:from-blue-400 dark:prose-h1:to-purple-400",
				"prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-8",
				"dark:prose-h2:text-blue-300",
				"prose-h3:text-xl prose-h3:font-semibold",
				"dark:prose-h3:text-purple-300",
				"prose-h4:text-lg prose-h4:font-medium",
				"dark:prose-h4:text-cyan-300",
				// 段落样式
				"prose-p:leading-7 dark:prose-p:text-gray-300",
				// 链接样式
				"prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
				"dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300",
				// 代码样式
				"prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:bg-muted prose-code:text-sm prose-code:font-mono",
				"dark:prose-code:bg-slate-800 dark:prose-code:text-pink-400",
				"prose-pre:bg-[#0d1117] prose-pre:rounded-lg prose-pre:overflow-x-auto",
				"prose-pre:p-4 prose-pre:text-sm prose-pre:border prose-pre:border-border",
				// 图片样式
				"prose-img:rounded-lg prose-img:shadow-md",
				// 引用样式
				"prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:px-4",
				"dark:prose-blockquote:border-blue-500 dark:prose-blockquote:bg-blue-950/30",
				// 列表样式
				"prose-ul:list-disc prose-ol:list-decimal",
				"dark:prose-li:text-gray-300 dark:marker:prose-li:text-blue-400",
				// 表格样式
				"prose-table:border-collapse prose-table:w-full",
				"prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2 prose-th:text-left",
				"dark:prose-th:bg-slate-800 dark:prose-th:text-blue-300",
				"prose-td:border prose-td:border-border prose-td:p-2",
				"dark:prose-td:text-gray-300",
				// 加粗和斜体
				"dark:prose-strong:text-white",
				"dark:prose-em:text-purple-300",
				// 分割线
				"dark:prose-hr:border-border",
				className
			)}
		>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[rehypeRaw, rehypeHeadingTree, rehypeHighlight]}
				components={components}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
