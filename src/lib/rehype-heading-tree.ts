/**
 * 自定义 rehype 插件：为标题添加树结构 ID
 */
import { visit } from 'unist-util-visit';
import type { Root } from 'hast';
import type { Element } from 'hast';
import { headingToId } from './toc';

export function rehypeHeadingTree() {
    return (tree: Root) => {
        // 层级计数器
        const levelCounters: number[] = [0, 0, 0, 0, 0, 0]; // h1-h6
        
        visit(tree, 'element', (node: Element) => {
            // 检查是否是标题元素
            if (node.tagName.match(/^h[1-6]$/)) {
                const level = parseInt(node.tagName[1]); // 1-6
                const levelIndex = level - 1; // 0-5
                
                // 提取标题文本
                const getText = (node: any): string => {
                    if (typeof node === 'string') return node;
                    if (node.type === 'text') return node.value;
                    if (node.children) {
                        return node.children.map(getText).join('');
                    }
                    return '';
                };
                
                const text = node.children ? node.children.map(getText).join('') : '';
                
                // 增加当前层级的计数
                levelCounters[levelIndex]++;
                
                // 重置所有更深层级的计数
                for (let i = levelIndex + 1; i < 6; i++) {
                    levelCounters[i] = 0;
                }
                
                // 生成基础 slug
                const baseSlug = headingToId(text);
                
                // 生成树结构 ID
                const pathParts = [baseSlug];
                for (let i = 0; i <= levelIndex; i++) {
                    if (levelCounters[i] > 0) {
                        pathParts.push(String(levelCounters[i]));
                    }
                }
                const id = pathParts.join('-');
                
                // 添加 ID 属性
                node.properties = node.properties || {};
                node.properties.id = id;
            }
        });
    };
}
