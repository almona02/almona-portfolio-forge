"use client"

import { shortcutManager } from "@/lib/keyboard/shortcuts"
import { cn } from "@/lib/utils"
import { Command } from "cmdk"
import { Calculator, Download, FileText, Hammer, Home, Plus, Save, Search, Settings, User } from "lucide-react"
import * as React from "react"
import { useNavigate } from "react-router-dom"
// We don't import Dialog from ui/dialog because cmdk has its own Dialog implementation
// capable of global positioning and focus management.

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()

  React.useEffect(() => {
    // Handler for toggling the palette
    const handleToggle = () => setOpen((prev) => !prev);
    
    // Shortcut handler
    const onShortcut = (e: KeyboardEvent) => {
      e.preventDefault();
      handleToggle();
    };

    // Register
    shortcutManager.register('app.command-palette', onShortcut);

    // Legacy support
    const handleCustomEvent = () => setOpen(true);
    window.addEventListener('open-command-palette', handleCustomEvent);
    
    return () => {
      shortcutManager.unregister('app.command-palette', onShortcut);
      window.removeEventListener('open-command-palette', handleCustomEvent);
    }
  }, [])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[640px] w-full bg-slate-950/90 backdrop-blur-xl border border-slate-800 shadow-2xl rounded-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 duration-200"
    >
      <div className="flex items-center border-b border-slate-800 px-3 h-14">
        <Search className="mr-2 h-4 w-4 shrink-0 text-amber-500" />
        <Command.Input 
          placeholder="Type a command or search..."
          className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="hidden lg:flex items-center gap-1">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-slate-700 bg-slate-900 px-1.5 font-mono text-[10px] font-medium text-slate-400 opacity-100">
            <span className="text-xs">CTRL</span>K
          </kbd>
        </div>
      </div>
      
      <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <Command.Empty className="py-6 text-center text-sm text-slate-500">
          No results found.
        </Command.Empty>

        <Command.Group heading="Navigation" className="text-slate-400 px-2 py-1.5 text-xs font-medium uppercase tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-slate-500">
          <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
            <Home className="mr-2 h-4 w-4 text-amber-500" />
            Home
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/drafting'))}>
            <Hammer className="mr-2 h-4 w-4 text-amber-500" />
            Drafting Workbench
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/engineering'))}>
            <Calculator className="mr-2 h-4 w-4 text-amber-500" />
            Engineering Bay
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/projects'))}>
            <FileText className="mr-2 h-4 w-4 text-amber-500" />
            Projects
          </CommandItem>
        </Command.Group>

        <Command.Group heading="Drafting Actions" className="text-slate-400 px-2 py-1.5 text-xs font-medium uppercase tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-slate-500">
          <CommandItem onSelect={() => runCommand(() => console.log('New Project'))}>
            <Plus className="mr-2 h-4 w-4 text-emerald-500" />
            New Project
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => console.log('Save Project'))}>
            <Save className="mr-2 h-4 w-4 text-emerald-500" />
            Save Project
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => console.log('Export PDF'))}>
            <Download className="mr-2 h-4 w-4 text-emerald-500" />
            Export to PDF
          </CommandItem>
        </Command.Group>

        <Command.Group heading="Settings" className="text-slate-400 px-2 py-1.5 text-xs font-medium uppercase tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-slate-500">
          <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
            <User className="mr-2 h-4 w-4 text-slate-400" />
            Profile
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/settings/system'))}>
            <Settings className="mr-2 h-4 w-4 text-slate-400" />
            System Preferences
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => shortcutManager.handleKeyDown(new KeyboardEvent('keydown', { key: '?', bubbles: true })))}>
             <span className="mr-2 h-4 w-4 flex items-center justify-center font-bold text-slate-400">?</span>
             Keyboard Shortcuts
          </CommandItem>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}

function CommandItem({ children, onSelect }: { children: React.ReactNode, onSelect?: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none",
        "text-slate-300 aria-selected:bg-amber-500/10 aria-selected:text-amber-400",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "transition-colors duration-100 ease-in-out cursor-pointer"
      )}
    >
      {children}
    </Command.Item>
  )
}
