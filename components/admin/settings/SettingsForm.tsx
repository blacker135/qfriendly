'use client';
// components/admin/settings/SettingsForm.tsx
// 统计设置表单组件 — 分组展示可配置项，支持批量保存

import { useState, useEffect, type FormEvent } from 'react';

// ─── 配置分组定义 ───

interface SettingField {
  key: string;
  label: string;
  description: string;
  type: 'number';
  min?: number;
  max?: number;
}

interface SettingGroup {
  title: string;
  fields: SettingField[];
}

/** 按功能分组的配置项定义 */
const settingGroups: SettingGroup[] = [
  {
    title: '心跳设置',
    fields: [
      {
        key: 'heartbeat_interval',
        label: '心跳间隔',
        description: '心跳间隔（分钟），范围 3-30',
        type: 'number',
        min: 3,
        max: 30,
      },
    ],
  },
  {
    title: '活跃度分层阈值',
    fields: [
      {
        key: 'segment_high_active',
        label: '高活用户最低天数',
        description: '高活用户最低活跃天数（过去30天）',
        type: 'number',
        min: 1,
        max: 30,
      },
      {
        key: 'segment_medium_active_min',
        label: '中活用户最低天数',
        description: '中活用户最低活跃天数',
        type: 'number',
        min: 1,
        max: 30,
      },
      {
        key: 'segment_medium_active_max',
        label: '中活用户最高天数',
        description: '中活用户最高活跃天数',
        type: 'number',
        min: 1,
        max: 30,
      },
      {
        key: 'segment_low_active_min',
        label: '低活用户最低天数',
        description: '低活用户最低活跃天数',
        type: 'number',
        min: 1,
        max: 30,
      },
      {
        key: 'segment_low_active_max',
        label: '低活用户最高天数',
        description: '低活用户最高活跃天数',
        type: 'number',
        min: 1,
        max: 30,
      },
    ],
  },
  {
    title: '流失判断',
    fields: [
      {
        key: 'segment_at_risk_days',
        label: '流失风险天数',
        description: '流失风险判断天数（未活跃天数）',
        type: 'number',
        min: 1,
        max: 365,
      },
      {
        key: 'segment_lost_days',
        label: '已流失天数',
        description: '已流失判断天数（未活跃天数）',
        type: 'number',
        min: 1,
        max: 365,
      },
    ],
  },
  {
    title: '数据保留',
    fields: [
      {
        key: 'data_retention_sessions',
        label: 'Session 保留天数',
        description: 'sessions 表保留天数',
        type: 'number',
        min: 0,
        max: 3650,
      },
      {
        key: 'data_retention_events',
        label: 'Event 保留天数',
        description: 'analytics_events 表保留天数',
        type: 'number',
        min: 0,
        max: 3650,
      },
      {
        key: 'data_retention_sub_events',
        label: '订阅事件保留天数',
        description: 'subscription_events 保留天数（0=永久）',
        type: 'number',
        min: 0,
        max: 3650,
      },
    ],
  },
];

/** 保存状态 */
type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export default function SettingsForm() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 页面加载时拉取当前配置
  useEffect(() => {
    setLoading(true);
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setErrorMessage(data.error);
        } else {
          setValues(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        setErrorMessage(err.message || '加载配置失败');
        setLoading(false);
      });
  }, []);

  /**
   * 更新单个字段值
   */
  const handleChange = (key: string, newValue: string) => {
    setValues((prev) => ({ ...prev, [key]: newValue }));
  };

  /**
   * 保存所有配置项
   */
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || '保存失败');
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || '保存配置失败');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  if (loading) {
    return <div className="text-gray-400">加载配置中...</div>;
  }

  if (errorMessage && Object.keys(values).length === 0) {
    return <div className="text-red-500">加载配置失败: {errorMessage}</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {settingGroups.map((group) => (
        <div
          key={group.title}
          className="rounded-lg p-6"
          style={{ backgroundColor: '#2D2D44' }}
        >
          <h2 className="text-lg font-semibold text-gray-200 mb-4">{group.title}</h2>
          <div className="space-y-5">
            {group.fields.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={`field-${field.key}`}
                  className="block text-sm font-medium text-gray-200 mb-1"
                >
                  {field.label}
                </label>
                <input
                  id={`field-${field.key}`}
                  type={field.type}
                  min={field.min}
                  max={field.max}
                  value={values[field.key] ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-gray-700 bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-400">{field.description}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 操作反馈区 */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saveStatus === 'saving'}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saveStatus === 'saving' ? '保存中...' : '保存配置'}
        </button>

        {saveStatus === 'success' && (
          <span className="text-green-400 text-sm">配置已保存</span>
        )}

        {saveStatus === 'error' && errorMessage && (
          <span className="text-red-400 text-sm">保存失败: {errorMessage}</span>
        )}
      </div>
    </form>
  );
}
