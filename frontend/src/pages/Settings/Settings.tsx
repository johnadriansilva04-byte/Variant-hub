import { useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import Panel from '../../components/ui/Panel'

export default function Settings() {
  const [aiConfig, setAiConfig] = useState({
    openaiKey: '',
    geminiKey: '',
    claudeKey: ''
  })
  const [metaConfig, setMetaConfig] = useState({
    facebookAppId: '',
    facebookAppSecret: '',
    instagramBusinessAccountId: ''
  })
  const [telegramConfig, setTelegramConfig] = useState({
    botToken: ''
  })
  const [tiktokConfig, setTikTokConfig] = useState({
    accessToken: ''
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        zone="system"
        zoneLabel="SISTEMA · Configurações"
        title="Configurações gerais"
        description="Configure as integrações e APIs usadas no Variant Hub."
      />

      <Panel title="Configurações de IA" className="rounded-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">OpenAI API Key</label>
            <input
              type="text"
              className="input"
              value={aiConfig.openaiKey}
              onChange={(e) => setAiConfig({ ...aiConfig, openaiKey: e.target.value })}
              placeholder="sk-..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Gemini API Key</label>
            <input
              type="text"
              className="input"
              value={aiConfig.geminiKey}
              onChange={(e) => setAiConfig({ ...aiConfig, geminiKey: e.target.value })}
              placeholder="..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Claude API Key</label>
            <input
              type="text"
              className="input"
              value={aiConfig.claudeKey}
              onChange={(e) => setAiConfig({ ...aiConfig, claudeKey: e.target.value })}
              placeholder="sk-ant-..."
            />
          </div>
        </div>
      </Panel>

      <Panel title="Configurações de Meta" className="rounded-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Facebook App ID</label>
            <input
              type="text"
              className="input"
              value={metaConfig.facebookAppId}
              onChange={(e) => setMetaConfig({ ...metaConfig, facebookAppId: e.target.value })}
              placeholder="..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Facebook App Secret</label>
            <input
              type="text"
              className="input"
              value={metaConfig.facebookAppSecret}
              onChange={(e) => setMetaConfig({ ...metaConfig, facebookAppSecret: e.target.value })}
              placeholder="..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Instagram Business Account ID</label>
            <input
              type="text"
              className="input"
              value={metaConfig.instagramBusinessAccountId}
              onChange={(e) => setMetaConfig({ ...metaConfig, instagramBusinessAccountId: e.target.value })}
              placeholder="..."
            />
          </div>
        </div>
      </Panel>

      <Panel title="Configurações de Telegram" className="rounded-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Bot Token</label>
            <input
              type="text"
              className="input"
              value={telegramConfig.botToken}
              onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
              placeholder="..."
            />
          </div>
        </div>
      </Panel>

      <Panel title="Configurações de TikTok" className="rounded-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Access Token</label>
            <input
              type="text"
              className="input"
              value={tiktokConfig.accessToken}
              onChange={(e) => setTikTokConfig({ ...tiktokConfig, accessToken: e.target.value })}
              placeholder="..."
            />
          </div>
        </div>
      </Panel>

      <button className="btn-store text-xs">Salvar configurações</button>
    </div>
  )
}
