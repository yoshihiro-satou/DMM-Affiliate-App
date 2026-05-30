export type WorkTab = 'latest' | 'popular'

const TABS: { id: WorkTab; label: string }[] = [
  { id: 'latest', label: '最新作' },
  { id: 'popular', label: '人気作' },
]

type Props = {
  actressId: string
  currentTab: WorkTab
}

export function WorkTabs({ actressId, currentTab }: Props) {
  return (
    <div className="flex border-b border-white/8">
      {TABS.map((tab) => (
        <a
          key={tab.id}
          href={
            tab.id === 'latest'
              ? `/actress/${actressId}`
              : `/actress/${actressId}?tab=${tab.id}`
          }
          className={`flex-1 py-3 text-center text-[13px] font-medium transition-colors ${
            currentTab === tab.id
              ? 'border-b-2 border-red-500 text-white'
              : 'text-white/65 hover:text-white/70'
          }`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {tab.label}
        </a>
      ))}
    </div>
  )
}
