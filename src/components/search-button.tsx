"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SearchButton() {
	const handleClick = () => {
		// 触发 Cmd+K 事件来打开搜索
		const event = new KeyboardEvent("keydown", {
			key: "k",
			metaKey: true,
			bubbles: true,
		});
		document.dispatchEvent(event);
	};

	return (
		<Button
			variant="outline"
			className="w-full justify-start text-muted-foreground"
			onClick={handleClick}
		>
			<Search className="mr-2 h-4 w-4" />
			<span className="flex-1 text-left">搜索文档...</span>
			<kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
				<span className="text-xs">⌘</span>K
			</kbd>
		</Button>
	);
}
