import {
  Archive,
  Boxes,
  Eye,
  FileCheck2,
  FileText,
  GitBranch,
  LayoutDashboard,
  MessageCircle,
  Network,
  Wrench,
  Workflow,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'engineer',
    email: 'engineer / author',
    avatar: '',
  },
  teams: [
    {
      name: '文档自动生成系统',
      logo: FileCheck2,
      plan: 'SysML DocGen',
    },
    {
      name: 'Project Workspace',
      logo: Boxes,
      plan: 'Model / Trace / Version',
    },
    {
      name: 'External Tools',
      logo: Archive,
      plan: 'Models / Evidence / MDK',
    },
  ],
  navGroups: [
    {
      title: 'Portfolio',
      items: [
        {
          title: 'Overview',
          url: '/#overview',
          icon: LayoutDashboard,
        },
        {
          title: 'Projects',
          url: '/#projects',
          icon: Boxes,
        },
        {
          title: 'Workspace',
          url: '/#workspace',
          icon: Boxes,
        },
      ],
    },
    {
      title: 'Project Workspace',
      items: [
        {
          title: 'Model',
          url: '/#model',
          icon: Archive,
        },
        {
          title: 'Views',
          url: '/#views',
          icon: Eye,
        },
        {
          title: 'Graph',
          url: '/#diagram',
          icon: Network,
        },
        {
          title: 'Trace',
          url: '/#trace',
          icon: Workflow,
        },
        {
          title: 'Versions',
          url: '/#version',
          icon: GitBranch,
        },
        {
          title: 'Docs',
          url: '/#docgen',
          icon: FileText,
        },
        {
          title: 'MDK',
          url: '/#mdk',
          icon: Wrench,
        },
        {
          title: 'Assistant',
          url: '/#assistant',
          icon: MessageCircle,
        },
      ],
    },
  ],
}
