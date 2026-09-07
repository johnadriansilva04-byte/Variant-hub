import PageHeader from '../../components/ui/PageHeader'
import Panel from '../../components/ui/Panel'

export default function System() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        zone="system"
        zoneLabel="SISTEMA · Status"
        title="Status do sistema"
        description="Logs, backups e informações técnicas do Variant Hub."
      />

      <Panel title="Status do servidor" className="rounded-2xl">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-dark-400">Backend</span>
            <span className="text-sm font-semibold text-store-400">Online</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-dark-400">Frontend</span>
            <span className="text-sm font-semibold text-store-400">Online</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-dark-400">Supabase</span>
            <span className="text-sm font-semibold text-store-400">Online</span>
          </div>
        </div>
      </Panel>

      <Panel title="Logs do sistema" className="rounded-2xl">
        <div className="text-center py-8">
          <p className="text-sm text-dark-400">Nenhum log ainda</p>
        </div>
      </Panel>

      <Panel title="Backups" className="rounded-2xl">
        <div className="text-center py-8">
          <p className="text-sm text-dark-400">Nenhum backup ainda</p>
        </div>
      </Panel>

      <Panel title="Versão" className="rounded-2xl">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-dark-400">Variant Hub</span>
            <span className="text-sm font-semibold text-dark-200">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-dark-400">Frontend</span>
            <span className="text-sm font-semibold text-dark-200">React 18</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-dark-400">Backend</span>
            <span className="text-sm font-semibold text-dark-200">Node.js 18</span>
          </div>
        </div>
      </Panel>
    </div>
  )
}
