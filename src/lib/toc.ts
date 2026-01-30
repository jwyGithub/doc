/**
 * 从 Markdown 内容中提取目录结构
 */

export interface TocItem {
    id: string;
    text: string;
    level: number;
}

/**
 * 将标题文本转换为 URL 友好的 ID
 */
export function headingToId(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5\s-]/g, '') // 保留字母、数字、中文、空格和连字符
        .replace(/\s+/g, '-') // 空格转连字符
        .replace(/-+/g, '-') // 多个连字符合并为一个
        .trim();
}

/**
 * 从 Markdown 内容中提取标题，生成唯一的树结构 ID
 * 格式：heading-slug-L1-L2-L3 (L代表 level counter)
 */
export function extractHeadings(markdown: string): TocItem[] {
    const headings: TocItem[] = [];
    const lines = markdown.split('\n');
    
    // 使用层级计数器追踪每个层级的序号
    const levelCounters: number[] = [0, 0, 0, 0, 0, 0]; // 支持 h1-h6

    for (const line of lines) {
        // 匹配 Markdown 标题格式：# 标题
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
            const level = match[1].length; // 1-6
            const text = match[2].trim();
            const levelIndex = level - 1; // 0-5
            
            // 增加当前层级的计数
            levelCounters[levelIndex]++;
            
            // 重置所有更深层级的计数
            for (let i = levelIndex + 1; i < 6; i++) {
                levelCounters[i] = 0;
            }
            
            // 生成基础 slug
            const baseSlug = headingToId(text);
            
            // 生成树结构 ID：基础slug + 层级路径
            // 例如：dasheng-1-2 表示第1个h1下的第2个h2，且文本slug是"dasheng"
            const pathParts = [baseSlug];
            for (let i = 0; i <= levelIndex; i++) {
                if (levelCounters[i] > 0) {
                    pathParts.push(String(levelCounters[i]));
                }
            }
            const id = pathParts.join('-');

            headings.push({ id, text, level });
        }
    }

    return headings;
}

/**
 * 滚动到指定的标题
 * 使用原生 scrollIntoView，简单可靠
 */
export function scrollToHeading(headingId: string) {
    const element = document.getElementById(headingId);
    if (!element) {
        console.warn(`Element with id "${headingId}" not found`);
        return;
    }

    // 使用原生的 scrollIntoView 方法
    // block: 'start' 会将元素滚动到容器顶部
    // behavior: 'smooth' 实现平滑滚动
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
    });
}
