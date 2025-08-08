const buckets = new Map();
function now(){ return Date.now(); }
export function estimateTokensFromChars(charCount){ return Math.ceil(charCount / 4); }
export function getBucket(ip){
  if (!buckets.has(ip)) buckets.set(ip, { negotiation:{used:0,resetAt:0}, salary:{used:0,resetAt:0} });
  return buckets.get(ip);
}
export function checkAndConsume(ip, kind, toConsume, dailyLimit, timeoutHours){
  const b = getBucket(ip)[kind];
  const nowMs = now();
  if (nowMs > b.resetAt){ b.used = 0; b.resetAt = nowMs + timeoutHours*3600*1000; }
  if (b.used + toConsume > dailyLimit){
    const waitMins = Math.ceil((b.resetAt - nowMs)/60000);
    return { ok:false, error:`Ліміт вичерпано. Спробуйте через ~${waitMins} хв.` };
  }
  b.used += toConsume;
  return { ok:true, remaining: dailyLimit - b.used, resetAt: b.resetAt };
}
