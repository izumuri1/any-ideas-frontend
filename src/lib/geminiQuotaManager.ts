// src/lib/geminiQuotaManager.ts
// Gemini API無料枠管理システム

interface UsageData {
  date: string;
  dailyCount: number;
  requestHistory: number[];
}

interface QuotaCheck {
  canRequest: boolean;
  reason: string | null;
  remaining: {
    daily: number;
    minute: number;
  };
}

interface UsageStats {
  daily: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
  minute: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
  resetTime: {
    daily: Date;
    minute: Date;
  };
}

interface LimitMessage {
  title: string;
  message: string;
  resetTime: Date | null;
}

class GeminiQuotaManager {
  private readonly DAILY_LIMIT = 15; // 1日あたりのリクエスト制限
  private readonly MINUTE_LIMIT = 15; // 1分あたりのリクエスト制限
  private readonly STORAGE_KEY = 'gemini_api_usage';

  // 使用状況をローカルストレージから取得
  getUsageData(): UsageData {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const today = new Date().toDateString();
    
    if (!stored) {
      return this.initializeUsageData(today);
    }
    
    const data = JSON.parse(stored);
    
    // 日付が変わっていたらリセット
    if (data.date !== today) {
      return this.initializeUsageData(today);
    }
    
    return data;
  }

  // 使用データの初期化
  private initializeUsageData(date: string): UsageData {
    const data = {
      date: date,
      dailyCount: 0,
      requestHistory: [] // 過去1分間のリクエスト記録
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  // 使用状況を保存
  private saveUsageData(data: UsageData): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  // 現在の分における使用回数をカウント
  private getRecentRequestCount(): number {
    const data = this.getUsageData();
    const oneMinuteAgo = Date.now() - 60000;
    
    // 1分以内のリクエストをフィルタリング
    const recentRequests = data.requestHistory.filter(
      timestamp => timestamp > oneMinuteAgo
    );
    
    return recentRequests.length;
  }

  // API使用可能かチェック
  canMakeRequest(): QuotaCheck {
    const data = this.getUsageData();
    const recentCount = this.getRecentRequestCount();
    
    const checks = {
      dailyLimitOk: data.dailyCount < this.DAILY_LIMIT,
      minuteLimitOk: recentCount < this.MINUTE_LIMIT,
      remainingDaily: this.DAILY_LIMIT - data.dailyCount,
      remainingMinute: this.MINUTE_LIMIT - recentCount
    };
    
    return {
      canRequest: checks.dailyLimitOk && checks.minuteLimitOk,
      reason: !checks.dailyLimitOk ? 'daily_limit_exceeded' : 
              !checks.minuteLimitOk ? 'minute_limit_exceeded' : null,
      remaining: {
        daily: Math.max(0, checks.remainingDaily),
        minute: Math.max(0, checks.remainingMinute)
      }
    };
  }

  // API使用を記録
  recordRequest(): void {
    const data = this.getUsageData();
    const now = Date.now();
    
    // 日次カウントを増加
    data.dailyCount += 1;
    
    // リクエスト履歴に追加
    data.requestHistory.push(now);
    
    // 1分以上古いレコードを削除
    const oneMinuteAgo = now - 60000;
    data.requestHistory = data.requestHistory.filter(
      timestamp => timestamp > oneMinuteAgo
    );
    
    this.saveUsageData(data);
  }

  // 使用状況の詳細を取得
  getUsageStats(): UsageStats {
    const data = this.getUsageData();
    const recentCount = this.getRecentRequestCount();
    
    return {
      daily: {
        used: data.dailyCount,
        limit: this.DAILY_LIMIT,
        remaining: this.DAILY_LIMIT - data.dailyCount,
        percentage: Math.round((data.dailyCount / this.DAILY_LIMIT) * 100)
      },
      minute: {
        used: recentCount,
        limit: this.MINUTE_LIMIT,
        remaining: this.MINUTE_LIMIT - recentCount,
        percentage: Math.round((recentCount / this.MINUTE_LIMIT) * 100)
      },
      resetTime: {
        daily: this.getNextDayReset(),
        minute: this.getNextMinuteReset()
      }
    };
  }

  // 翌日のリセット時刻を計算
  private getNextDayReset(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  // 次の分のリセット時刻を計算
  private getNextMinuteReset(): Date {
    const nextMinute = new Date();
    nextMinute.setMinutes(nextMinute.getMinutes() + 1);
    nextMinute.setSeconds(0, 0);
    return nextMinute;
  }

  // 制限に達した場合のエラーメッセージ
  getLimitExceededMessage(reason: string): LimitMessage {
    const stats = this.getUsageStats();
    
    switch (reason) {
      case 'daily_limit_exceeded':
        return {
          title: '本日の利用制限に達しました',
          message: `本日のGemini API使用回数が上限（${this.DAILY_LIMIT}回）に達しました。明日の0時にリセットされます。`,
          resetTime: stats.resetTime.daily
        };
      case 'minute_limit_exceeded':
        return {
          title: '使用頻度制限に達しました',
          message: `1分間の使用制限（${this.MINUTE_LIMIT}回）に達しました。しばらくお待ちください。`,
          resetTime: stats.resetTime.minute
        };
      default:
        return {
          title: '使用制限に達しました',
          message: 'APIの使用制限に達しました。しばらくお待ちください。',
          resetTime: null
        };
    }
  }

  // デバッグ用：使用状況をリセット
  resetUsage(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

// シングルトンパターンでエクスポート
export const geminiQuotaManager = new GeminiQuotaManager();