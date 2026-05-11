// lib/lemonsqueezy/client.ts
// LemonSqueezy API 客户端
// 封装 Checkout 创建

const LS_BASE = 'https://api.lemonsqueezy.com/v1';

/**
 * 通用 LS API 请求封装
 * 自动附加 API Key 认证头和 JSON 内容类型
 */
async function lsRequest(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${LS_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('LemonSqueezy API error:', res.status, errBody);
    throw new Error(`LemonSqueezy API error: ${res.status}`);
  }

  return res.json();
}

/**
 * 创建 LemonSqueezy Checkout
 * @param variantId - LS 产品变体 ID
 * @param userId - 当前登录用户 ID
 * @returns Checkout URL，前端应重定向到该地址完成支付
 */
export async function createCheckout(
  variantId: string,
  userId: string,
  redirectUrl?: string,
): Promise<string> {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;

  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          custom: { user_id: userId },
        },
        product_options: {
          redirect_url: redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        },
      },
      relationships: {
        store: { data: { type: 'stores', id: storeId } },
        variant: { data: { type: 'variants', id: variantId } },
      },
    },
  };

  const result = await lsRequest('/checkouts', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return result.data.attributes.url;
}
