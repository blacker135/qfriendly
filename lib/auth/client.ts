// lib/auth/client.ts
// Better Auth 浏览器客户端
// 使用相对路径，自动跟随当前域名，避免部署域名配置问题

import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient();
