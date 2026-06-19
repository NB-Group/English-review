const ACCOUNT_KEY = 'english_review_account_name';
const STORAGE_KEYS = [
  'english_review_settings_v2',
  'english_review_stats_v2',
  'english_review_progress',
  'english_review_all_progress',
  'grade8_migration_completed'
];

export class AccountStorage {
  constructor() {
    this.accountName = '';
    this.overlay = document.getElementById('account-overlay');
    this.input = document.getElementById('account-name');
    this.enterBtn = document.getElementById('account-enter-btn');
    this.chip = document.getElementById('account-chip');
    this.submitHandler = null;
  }

  async init() {
    this.bindAccountForm();
    this.chip?.addEventListener('click', () => this.showAccountPicker());

    const remembered = localStorage.getItem(ACCOUNT_KEY) || '';
    if (remembered) {
      await this.selectAccount(remembered);
      return remembered;
    }

    return new Promise((resolve) => {
      this.showAccountPicker();
      this.submitHandler = async (name) => {
        await this.selectAccount(name);
        resolve(name);
      };
    });
  }

  bindAccountForm() {
    const submit = async () => {
      const name = (this.input?.value || '').trim() || 'default';
      if (this.submitHandler) {
        await this.submitHandler(name);
      } else {
        await this.selectAccount(name);
      }
    };

    this.enterBtn?.addEventListener('click', submit);
    this.input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') submit();
    });
  }

  showAccountPicker() {
    if (this.input) this.input.value = this.accountName || localStorage.getItem(ACCOUNT_KEY) || '';
    this.overlay?.classList.remove('hidden');
    window.setTimeout(() => this.input?.focus(), 0);
  }

  async selectAccount(name) {
    this.accountName = name;
    localStorage.setItem(ACCOUNT_KEY, name);
    try {
      await this.loadRemoteData();
    } catch (error) {
      console.error('加载账号数据失败:', error);
    }
    this.overlay?.classList.add('hidden');
    if (this.chip) {
      this.chip.textContent = name;
      this.chip.title = `当前账号：${name}。点击切换`;
      this.chip.classList.remove('hidden');
    }
  }

  buildPayload() {
    const payload = {};
    for (const key of STORAGE_KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) payload[key] = value;
    }
    return payload;
  }

  async loadRemoteData() {
    const response = await fetch(`/api/account-data?user=${encodeURIComponent(this.accountName)}`);
    const payload = await response.json();
    const data = payload.data || {};
    // 只补充缺失的 key，不覆盖本地已有的最新数据
    // （beforeunload 的服务器存档可能因浏览器取消请求而滞后）
    for (const key of STORAGE_KEYS) {
      if (!localStorage.getItem(key)) {
        const value = data[key];
        if (value !== undefined && value !== null) {
          localStorage.setItem(key, value);
        }
      }
    }
  }

  async saveRemoteData() {
    if (!this.accountName) return;
    try {
      await fetch(`/api/account-data?user=${encodeURIComponent(this.accountName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.buildPayload())
      });
    } catch (error) {
      console.error('保存账号数据失败:', error);
    }
  }
}
