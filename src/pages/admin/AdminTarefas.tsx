import React, { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, eachHourOfInterval, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, Search, CheckCircle2,
  Phone, Mail, MessageSquare, User, Calendar as LucideCalendar, Briefcase, ExternalLink,
  Trash2, Pencil, MoreHorizontal, Loader2, Edit
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const priorityColors: Record<string, string> = {
  Alta: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
  Média: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  Baixa: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/20",
};

const taskTypeIcons: Record<string, any> = {
  Ligação: Phone,
  Visita: LucideCalendar,
  "E-mail": Mail,
  WhatsApp: MessageSquare,
  Interno: Briefcase,
};

const eventTypeColors: Record<string, string> = {
  Reunião: "bg-primary text-primary-foreground",
  Visita: "bg-success text-success-foreground",
  Ligação: "bg-info text-info-foreground",
};

export default function AdminTarefas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("tarefas");

  const [taskStatusFilter, setTaskStatusFilter] = useState("Todos");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("Todas");
  const [taskUserFilter, setTaskUserFilter] = useState("all");
  const [taskSearch, setTaskSearch] = useState("");

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [finishTaskModalOpen, setFinishTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [annotation, setAnnotation] = useState("");

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventDetailModalOpen, setEventDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [initialEventDate, setInitialEventDate] = useState<Date | null>(null);

  const [calendarMode, setCalendarMode] = useState<"dia" | "semana" | "mes">("mes");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Queries
  const { data: users = [] } = useQuery({
    queryKey: ["profiles-tarefas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name");
      if (error) throw error;
      return data || [];
    }
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads-tarefas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("id, name, kind");
      if (error) throw error;
      return data || [];
    }
  });

  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("deadline", { ascending: true });
      if (error) throw error;
      return data.map((t) => ({ ...t, deadline: new Date(t.deadline) }));
    }
  });

  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").order("start_time", { ascending: true });
      if (error) throw error;
      return data.map((e) => ({ ...e, start: new Date(e.start_time), end: new Date(e.end_time) }));
    }
  });

  // Mutations
  const createTask = useMutation({
    mutationFn: async (newTask: any) => {
      const { error } = await supabase.from("tasks").insert(newTask);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa criada!");
      setTaskModalOpen(false);
    },
    onError: (err) => toast.error("Erro ao criar: " + err.message)
  });

  const finishTask = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from("tasks").update({ status: "Concluída", notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa concluída!");
      setFinishTaskModalOpen(false);
      setAnnotation("");
    },
    onError: (err) => toast.error("Erro ao concluir: " + err.message)
  });

  const createEvent = useMutation({
    mutationFn: async (newEvent: any) => {
      const { error } = await supabase.from("events").insert(newEvent);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento agendado!");
      setEventModalOpen(false);
    },
    onError: (err) => toast.error("Erro ao agendar: " + err.message)
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento removido!");
      setEventDetailModalOpen(false);
    },
    onError: (err) => toast.error("Erro ao remover: " + err.message)
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from("events").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento atualizado!");
      setEventEditModalOpen(false);
    },
    onError: (err) => toast.error("Erro ao atualizar: " + err.message)
  });

  const [eventEditModalOpen, setEventEditModalOpen] = useState(false);
  const [eventEditing, setEventEditing] = useState<any>(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t: any) => {
      if (taskStatusFilter !== "Todos" && t.status !== taskStatusFilter) return false;
      if (taskPriorityFilter !== "Todas" && t.priority !== taskPriorityFilter) return false;
      if (taskUserFilter !== "all" && t.responsible_id !== taskUserFilter) return false;
      if (taskSearch && !t.title.toLowerCase().includes(taskSearch.toLowerCase())) return false;
      return true;
    });
  }, [tasks, taskStatusFilter, taskPriorityFilter, taskUserFilter, taskSearch]);

  const todayTasksCount = tasks.filter((t: any) => isSameDay(t.deadline, new Date()) && t.status !== "Concluída").length;
  const todayEventsCount = events.filter((e: any) => isSameDay(e.start, new Date())).length;

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <LucideCalendar className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Resumo do Dia</h2>
            <p className="text-muted-foreground">
              Você tem <span className="font-bold text-foreground">{todayTasksCount}</span> tarefas pendentes e{" "}
              <span className="font-bold text-foreground">{todayEventsCount}</span> eventos agendados para hoje.
            </p>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
        </TabsList>

        <TabsContent value="tarefas" className="space-y-6 outline-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Gestão de Tarefas</h3>
              <p className="text-xs text-muted-foreground">Acompanhe e organize as atividades da operação.</p>
            </div>
            <Button onClick={() => setTaskModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Nova Tarefa
            </Button>
          </div>

          <Tabs defaultValue="minhas" className="space-y-4">
            <TabsList>
              <TabsTrigger value="minhas">Minhas Tarefas</TabsTrigger>
              <TabsTrigger value="equipe">Equipe</TabsTrigger>
            </TabsList>

            <TabsContent value="minhas" className="space-y-4">
              {isLoadingTasks ? <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div> : (
                <TaskGrid 
                  tasks={filteredTasks.filter((t: any) => t.responsible_id === user?.id)} 
                  users={users}
                  onFinish={(t: any) => { setSelectedTask(t); setFinishTaskModalOpen(true); }} 
                />
              )}
            </TabsContent>

            <TabsContent value="equipe" className="space-y-4">
              {isLoadingTasks ? <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div> : (
                <TaskGrid 
                  tasks={filteredTasks} 
                  users={users}
                  onFinish={(t: any) => { setSelectedTask(t); setFinishTaskModalOpen(true); }} 
                />
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="agenda" className="space-y-6 outline-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">Calendário</h3>
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button variant={calendarMode === "dia" ? "secondary" : "ghost"} size="sm" className="text-xs h-7 px-3" onClick={() => setCalendarMode("dia")}>Dia</Button>
                <Button variant={calendarMode === "semana" ? "secondary" : "ghost"} size="sm" className="text-xs h-7 px-3" onClick={() => setCalendarMode("semana")}>Semana</Button>
                <Button variant={calendarMode === "mes" ? "secondary" : "ghost"} size="sm" className="text-xs h-7 px-3" onClick={() => setCalendarMode("mes")}>Mês</Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarNavigation currentDate={currentDate} mode={calendarMode} onNavigate={setCurrentDate} />
              <Button onClick={() => { setInitialEventDate(new Date()); setEventModalOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" /> Novo Evento
              </Button>
            </div>
          </div>

          <Card className="p-4 overflow-hidden min-h-[600px]">
            {isLoadingEvents ? <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div> : (
              <>
                {calendarMode === "mes" && <MonthCalendar currentDate={currentDate} events={events} onDayClick={(day: Date) => { setInitialEventDate(day); setEventModalOpen(true); }} onEventClick={(ev: any) => { setSelectedEvent(ev); setEventDetailModalOpen(true); }} />}
                {calendarMode === "semana" && <WeekCalendar currentDate={currentDate} events={events} onDayClick={(day: Date, hour?: Date) => { setInitialEventDate(hour || day); setEventModalOpen(true); }} onEventClick={(ev: any) => { setSelectedEvent(ev); setEventDetailModalOpen(true); }} />}
                {calendarMode === "dia" && <DayCalendar currentDate={currentDate} events={events} onDayClick={(hour: Date) => { setInitialEventDate(hour); setEventModalOpen(true); }} onEventClick={(ev: any) => { setSelectedEvent(ev); setEventDetailModalOpen(true); }} />}
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <TaskModal open={taskModalOpen} setOpen={setTaskModalOpen} onCreate={(t: any) => createTask.mutate(t)} users={users} leads={leads} currentUserId={user?.id} busy={createTask.isPending} />
      <FinishTaskModal open={finishTaskModalOpen} setOpen={setFinishTaskModalOpen} task={selectedTask} annotation={annotation} setAnnotation={setAnnotation} onFinish={() => finishTask.mutate({ id: selectedTask.id, notes: annotation })} busy={finishTask.isPending} />
      <EventModal open={eventModalOpen} setOpen={setEventModalOpen} onCreate={(e: any) => createEvent.mutate(e)} users={users} leads={leads} currentUserId={user?.id} busy={createEvent.isPending} initialDate={initialEventDate} />
      <EventDetailModal open={eventDetailModalOpen} setOpen={setEventDetailModalOpen} event={selectedEvent} onEdit={(ev: any) => { setEventEditing(ev); setEventEditModalOpen(true); }} onDelete={(id: string) => deleteEvent.mutate(id)} busy={deleteEvent.isPending} />
      <EditEventModal open={eventEditModalOpen} setOpen={setEventEditModalOpen} event={eventEditing} onUpdate={(id: string, data: any) => updateEvent.mutate({ id, data })} users={users} leads={leads} busy={updateEvent.isPending} />
    </div>
  );
}

function TaskControls({ search, setSearch, status, setStatus, priority, setPriority, userId, setUserId, showUserFilter, users }: any) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar tarefas..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos Status</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Em andamento">Em andamento</SelectItem>
            <SelectItem value="Concluída">Concluída</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas Prioridades</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Média">Média</SelectItem>
            <SelectItem value="Baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
        {showUserFilter && (
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer Responsável</SelectItem>
              {users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.full_name || 'Usuário Sem Nome'}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
    </Card>
  );
}

function TaskGrid({ tasks, users, onFinish }: any) {
  const weekDays = useMemo(() => {
    const today = new Date();
    const startOfWeekDay = new Date(today);
    startOfWeekDay.setDate(today.getDate() - today.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeekDay);
      d.setDate(startOfWeekDay.getDate() + i);
      return d;
    });
  }, []);

  const groupedByDay = useMemo(() => {
    const groups: Record<string, any[]> = {};
    weekDays.forEach(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      groups[dayStr] = tasks.filter((t: any) => {
        const taskDate = format(t.deadline, "yyyy-MM-dd");
        return taskDate === dayStr;
      });
    });
    return groups;
  }, [tasks, weekDays]);

  const weekDayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  if (tasks.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Nenhuma tarefa encontrada.</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDays.map((day, i) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayTasks = groupedByDay[dayStr] || [];
        const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
        
        return (
          <Card key={i} className={cn("min-h-[400px] flex flex-col", isToday && "border-primary border-2")}>
            <div className={cn("p-3 border-b text-center", isToday ? "bg-primary text-primary-foreground" : "bg-muted/50")}>
              <p className="text-xs font-bold">{weekDayNames[i]}</p>
              <p className="text-lg font-bold">{format(day, "d")}</p>
              <Badge variant={isToday ? "secondary" : "outline"} className="mt-1">{dayTasks.length} tarefas</Badge>
            </div>
            <div className="p-2 space-y-2 flex-1 overflow-y-auto">
              {dayTasks.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">—</div>
              ) : (
                dayTasks.map((t: any) => {
                  const isOverdue = t.deadline < new Date() && t.status !== "Concluída";
                  const TypeIcon = taskTypeIcons[t.task_type] || Briefcase;
                  const user = users.find((u: any) => u.id === t.responsible_id);
                  
                  return (
                    <div 
                      key={t.id} 
                      className={cn(
                        "p-2 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 text-xs",
                        t.status === "Concluída" && "bg-muted/30 opacity-60",
                        isOverdue && "border-red-500/50 bg-red-500/5"
                      )}
                      onClick={() => onFinish(t)}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <TypeIcon className="w-3 h-3 text-muted-foreground" />
                        <span className="font-bold">{format(t.deadline, "HH:mm")}</span>
                      </div>
                      <p className={cn("font-semibold leading-tight", isOverdue && "text-red-600")}>{t.title}</p>
                      {user && <p className="text-[10px] text-muted-foreground mt-1">👤 {user.full_name}</p>}
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="outline" className={cn("h-4 px-1 text-[8px]", priorityColors[t.priority])}>{t.priority}</Badge>
                        <Badge variant="secondary" className="h-4 px-1 text-[8px]">{t.status}</Badge>
                      </div>
                      {t.status !== "Concluída" && (
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 mt-1" onClick={(e) => { e.stopPropagation(); onFinish(t); }}>
                          <CheckCircle2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function TaskTable({ tasks, users, onFinish }: any) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[400px]">Tarefa</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhuma tarefa encontrada.</TableCell></TableRow>
          ) : (
            tasks.map((t: any) => {
              const isOverdue = t.deadline < new Date() && t.status !== "Concluída";
              const TypeIcon = taskTypeIcons[t.task_type] || Briefcase;
              const responsible = users.find((u: any) => u.id === t.responsible_id)?.full_name || "—";
              return (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-2 rounded-lg bg-muted flex items-center justify-center"><TypeIcon className="w-4 h-4 text-muted-foreground" /></div>
                      <div>
                        <p className="font-semibold text-sm leading-tight">{t.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t.task_type} {t.linked_to && `• Vinc. a: ${t.linked_to}`}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className={cn("font-medium", priorityColors[t.priority])}>{t.priority}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className={cn("text-sm", isOverdue && "text-red-600 font-bold")}>{format(t.deadline, "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      {isOverdue && <Badge variant="destructive" className="h-4 px-1 text-[9px] w-fit mt-1 uppercase">Vencida</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{responsible}</TableCell>
                  <TableCell><Badge variant="secondary" className={cn("capitalize", t.status === "Concluída" && "bg-success/10 text-success border-success/20", t.status === "Em andamento" && "bg-warning/10 text-warning border-warning/20")}>{t.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {t.status !== "Concluída" && <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onFinish(t)}><CheckCircle2 className="w-3.5 h-3.5" /> Concluir</Button>}
                      <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function CalendarNavigation({ currentDate, mode, onNavigate }: any) {
  const navigate = (dir: number) => {
    if (mode === "mes") onNavigate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (mode === "semana") onNavigate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else onNavigate(dir > 0 ? addDays(currentDate, 1) : subDays(currentDate, 1));
  };

  return (
    <div className="flex items-center border border-border rounded-lg overflow-hidden">
      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
      <div className="px-3 py-1 bg-muted/50 text-sm font-medium border-x border-border min-w-[140px] text-center">
        {mode === "mes" && format(currentDate, "MMMM yyyy", { locale: ptBR })}
        {mode === "semana" && `Semana ${format(startOfWeek(currentDate), "dd/MM")}`}
        {mode === "dia" && format(currentDate, "dd 'de' MMMM", { locale: ptBR })}
      </div>
      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(1)}><ChevronRight className="w-4 h-4" /></Button>
    </div>
  );
}

function MonthCalendar({ currentDate, events, onEventClick, onDayClick }: any) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      <div className="grid grid-cols-7 border-b border-border bg-muted/50">
        {weekDays.map((wd) => <div key={wd} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{wd}</div>)}
      </div>
      <div className="grid grid-cols-7 flex-1 border-l border-t border-border">
        {days.map((day, i) => {
          const dayEvents = events.filter((e: any) => isSameDay(e.start, day));
          const isSelectedMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());
          return (
            <div key={i} onClick={() => onDayClick?.(day)} className={cn("min-h-[100px] p-2 border-r border-b border-border transition-colors cursor-pointer", !isSelectedMonth && "bg-muted/30 text-muted-foreground/50", isSelectedMonth && "hover:bg-muted/10")}>
              <div className="flex items-center justify-between mb-1">
                <span className={cn("text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full", isToday && "bg-primary text-primary-foreground")}>{format(day, "d")}</span>
                {dayEvents.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[9px]">{dayEvents.length}</Badge>}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((ev: any) => (
                  <div 
                    key={ev.id} 
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }} 
                    className={cn(
                      "w-full text-[10px] p-1.5 rounded border-l-2 cursor-pointer transition-all hover:opacity-80 flex flex-col gap-0.5 group",
                      eventTypeColors[ev.event_type] || "bg-muted text-foreground border-muted-foreground"
                    )}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold truncate">{format(ev.start, "HH:mm")}</span>
                      <span className="opacity-70 text-[9px] uppercase">{ev.event_type}</span>
                    </div>
                    <span className="line-clamp-2 leading-tight font-medium">{ev.title}</span>
                    {ev.linked_to && <span className="opacity-80 text-[8px] leading-tight line-clamp-1 mt-0.5 font-medium">Vinculado: {ev.linked_to}</span>}
                    {ev.description && <span className="opacity-70 text-[8px] leading-tight line-clamp-1 mt-0.5">{ev.description}</span>}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] text-muted-foreground text-center py-1">+{dayEvents.length - 3} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekCalendar({ currentDate, events, onEventClick, onDayClick }: any) {
  const start = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const hours = eachHourOfInterval({ start: setHours(new Date(), 8), end: setHours(new Date(), 19) });

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border bg-muted/50">
        <div className="border-r border-border"></div>
        {days.map((day) => (
          <div key={day.toString()} onClick={() => onDayClick?.(day)} className="py-2 text-center border-r border-border cursor-pointer hover:bg-muted/10 transition-colors">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">{format(day, "EEE", { locale: ptBR })}</p>
            <p className={cn("text-sm font-bold", isSameDay(day, new Date()) && "text-primary")}>{format(day, "dd")}</p>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[80px_repeat(7,1fr)]">
          {hours.map((hour) => (
            <React.Fragment key={hour.toString()}>
              <div className="h-16 border-r border-b border-border text-[10px] text-muted-foreground p-2 text-right">{format(hour, "HH:mm")}</div>
              {days.map((day) => {
                const hourEvents = events.filter((e: any) => isSameDay(e.start, day) && format(e.start, "HH") === format(hour, "HH"));
                return (
                  <div key={day.toString() + hour.toString()} onClick={() => onDayClick?.(day, hour)} className="h-16 border-r border-b border-border p-1 relative cursor-pointer hover:bg-muted/10 transition-colors group">
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-4 h-4 text-muted-foreground/30" />
                    </div>
                    {hourEvents.map((ev: any) => (
                      <button key={ev.id} onClick={(e) => { e.stopPropagation(); onEventClick(ev); }} className={cn("absolute inset-x-1 top-1 p-1 rounded text-[10px] text-left truncate flex flex-col gap-0.5 z-10", eventTypeColors[ev.event_type])}>
                        <span className="font-bold truncate w-full">{ev.title}</span>
                        {ev.linked_to && <span className="opacity-80 text-[8px] leading-tight truncate w-full">👤 {ev.linked_to}</span>}
                      </button>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function DayCalendar({ currentDate, events, onEventClick }: any) {
  const hours = eachHourOfInterval({ start: setHours(new Date(), 8), end: setHours(new Date(), 20) });
  const dayEvents = events.filter((e: any) => isSameDay(e.start, currentDate));

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border bg-muted/30">
        <h4 className="font-bold">{format(currentDate, "dd 'de' MMMM", { locale: ptBR })}</h4>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {hours.map((hour) => {
            const evs = dayEvents.filter((e: any) => format(e.start, "HH") === format(hour, "HH"));
            return (
              <div key={hour.toString()} className="flex gap-4">
                <div className="w-16 text-right text-xs text-muted-foreground font-mono pt-1">{format(hour, "HH:mm")}</div>
                <div className="flex-1 min-h-[40px] border-l-2 border-muted pl-4 space-y-2">
                  {evs.map((ev: any) => (
                    <Card key={ev.id} className="p-3 cursor-pointer hover:bg-muted/50" onClick={() => onEventClick(ev)}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold">{ev.title}</p>
                        <Badge className={eventTypeColors[ev.event_type]}>{ev.event_type}</Badge>
                      </div>
                      {ev.linked_to && <p className="text-xs font-semibold mt-1">👤 Vinc. a: {ev.linked_to}</p>}
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.description}</p>
                    </Card>
                  ))}
                  {evs.length === 0 && <div className="h-4"></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TaskModal({ open, setOpen, onCreate, users, leads, currentUserId, busy }: any) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle><DialogDescription>Preencha os dados abaixo para criar uma nova tarefa operacional.</DialogDescription></DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onCreate({ 
            title: fd.get("title"), 
            task_type: fd.get("type"), 
            priority: fd.get("priority"), 
            deadline: new Date(fd.get("deadline") as string).toISOString(), 
            responsible_id: fd.get("responsible"), 
            linked_to: fd.get("linkedTo"), 
            status: fd.get("status"), 
            notes: fd.get("notes") 
          });
        }} className="space-y-4 pt-4">
          <div className="space-y-2"><Label htmlFor="title">Título da Tarefa</Label><Input id="title" name="title" placeholder="Ex: Retornar para Lead X" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="type">Tipo</Label><Select name="type" defaultValue="Ligação"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Ligação">Ligação</SelectItem><SelectItem value="Visita">Visita</SelectItem><SelectItem value="E-mail">E-mail</SelectItem><SelectItem value="WhatsApp">WhatsApp</SelectItem><SelectItem value="Interno">Interno</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="priority">Prioridade</Label><Select name="priority" defaultValue="Média"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Alta">Alta</SelectItem><SelectItem value="Média">Média</SelectItem><SelectItem value="Baixa">Baixa</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="deadline">Prazo</Label><Input name="deadline" type="datetime-local" required /></div>
            <div className="space-y-2"><Label htmlFor="responsible">Responsável</Label><Select name="responsible" defaultValue={currentUserId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.full_name || 'Sem Nome'}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="linkedTo">Vincular a</Label><Select name="linkedTo"><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{leads.map((l: any) => <SelectItem key={l.id} value={l.name}>{l.name} ({l.kind})</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="status">Status</Label><Select name="status" defaultValue="Pendente"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Em andamento">Em andamento</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter className="pt-4"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Tarefa"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FinishTaskModal({ open, setOpen, task, annotation, setAnnotation, onFinish, busy }: any) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Concluir Tarefa</DialogTitle><DialogDescription>Descreva brevemente o resultado desta tarefa.</DialogDescription></DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="p-3 bg-muted rounded-lg text-sm border border-border">
            <p className="font-semibold">{task?.title}</p>
            <p className="text-muted-foreground mt-0.5">Prazo: {task && format(task.deadline, "dd/MM/yyyy HH:mm")}</p>
          </div>
          <div className="space-y-2"><Label htmlFor="finishNote">O que foi feito? *</Label><Textarea id="finishNote" value={annotation} onChange={(e) => setAnnotation(e.target.value)} autoFocus /></div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Voltar</Button><Button onClick={onFinish} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar e Concluir"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EventModal({ open, setOpen, onCreate, users, leads, currentUserId, busy, initialDate }: any) {
  const getLocalISO = (date: Date) => {
    const tz = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tz).toISOString().slice(0, 16);
  };
  
  const defaultStart = initialDate ? getLocalISO(initialDate) : getLocalISO(new Date());
  const defaultEnd = initialDate ? getLocalISO(new Date(initialDate.getTime() + 60 * 60 * 1000)) : getLocalISO(new Date(Date.now() + 60 * 60 * 1000));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Novo Evento</DialogTitle></DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onCreate({ 
            title: fd.get("title"), 
            event_type: fd.get("type"), 
            start_time: new Date(fd.get("start") as string).toISOString(), 
            end_time: new Date(fd.get("end") as string).toISOString(), 
            responsible_id: fd.get("responsible"), 
            linked_to: fd.get("linkedTo"), 
            description: fd.get("description") 
          });
        }} className="space-y-4 pt-4">
          <div className="space-y-2"><Label>Título</Label><Input name="title" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Tipo</Label><Select name="type" defaultValue="Reunião"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Reunião">Reunião</SelectItem><SelectItem value="Visita">Visita</SelectItem><SelectItem value="Ligação">Ligação</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Responsável</Label><Select name="responsible" defaultValue={currentUserId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.full_name || 'Sem Nome'}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Início</Label><Input name="start" type="datetime-local" defaultValue={defaultStart} required /></div>
            <div className="space-y-2"><Label>Término</Label><Input name="end" type="datetime-local" defaultValue={defaultEnd} required /></div>
          </div>
          <div className="space-y-2"><Label>Vincular a</Label><Select name="linkedTo"><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{leads.map((l: any) => <SelectItem key={l.id} value={l.name}>{l.name} ({l.kind})</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Descrição</Label><Textarea name="description" /></div>
          <DialogFooter className="pt-4"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Evento"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EventDetailModal({ open, setOpen, event, onEdit, onDelete, busy }: any) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2"><Badge className={event ? eventTypeColors[event.event_type] : ""}>{event?.event_type}</Badge></div>
          <DialogTitle className="text-xl">{event?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4 py-2 border-y border-border">
            <div className="space-y-1"><p className="text-[10px] uppercase text-muted-foreground font-bold">Horário</p><div className="flex items-center gap-1.5 text-sm"><Clock className="w-3.5 h-3.5 text-muted-foreground" />{event && `${format(event.start, "HH:mm")} - ${format(event.end, "HH:mm")}`}</div></div>
            <div className="space-y-1"><p className="text-[10px] uppercase text-muted-foreground font-bold">Data</p><div className="flex items-center gap-1.5 text-sm"><CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />{event && format(event.start, "dd 'de' MMMM", { locale: ptBR })}</div></div>
          </div>
          {event?.linked_to && (
            <div className="space-y-1"><p className="text-[10px] uppercase text-muted-foreground font-bold">Vinculado a</p><p className="text-sm font-medium">{event.linked_to}</p></div>
          )}
          <div className="space-y-1"><p className="text-[10px] uppercase text-muted-foreground font-bold">Descrição</p><p className="text-sm text-muted-foreground">{event?.description || "Sem descrição."}</p></div>
        </div>
        <DialogFooter className="pt-4">
          <div className="flex gap-2 w-full justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => onEdit(event)} disabled={busy}>
                <Edit className="w-4 h-4" /> Editar
              </Button>
              <Button variant="destructive" size="sm" className="gap-2" onClick={() => onDelete(event?.id)} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Excluir</>}
              </Button>
            </div>
            <Button size="sm" onClick={() => setOpen(false)}>Fechar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditEventModal({ open, setOpen, event, onUpdate, users, leads, busy }: any) {
  const getLocalISO = (date: Date) => {
    const tz = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tz).toISOString().slice(0, 16);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar Evento</DialogTitle></DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onUpdate(event.id, {
            title: fd.get("title"),
            event_type: fd.get("type"),
            start_time: new Date(fd.get("start") as string).toISOString(),
            end_time: new Date(fd.get("end") as string).toISOString(),
            responsible_id: fd.get("responsible"),
            linked_to: fd.get("linkedTo"),
            description: fd.get("description")
          });
        }} className="space-y-4 pt-4">
          <div className="space-y-2"><Label>Título</Label><Input name="title" defaultValue={event?.title} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Tipo</Label><Select name="type" defaultValue={event?.event_type}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Reunião">Reunião</SelectItem><SelectItem value="Visita">Visita</SelectItem><SelectItem value="Ligação">Ligação</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Responsável</Label><Select name="responsible" defaultValue={event?.responsible_id}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.full_name || 'Sem Nome'}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Início</Label><Input name="start" type="datetime-local" defaultValue={event ? getLocalISO(new Date(event.start_time)) : ""} required /></div>
            <div className="space-y-2"><Label>Término</Label><Input name="end" type="datetime-local" defaultValue={event ? getLocalISO(new Date(event.end_time)) : ""} required /></div>
          </div>
          <div className="space-y-2"><Label>Vincular a</Label><Select name="linkedTo" defaultValue={event?.linked_to || ""}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{leads.map((l: any) => <SelectItem key={l.id} value={l.name}>{l.name} ({l.kind})</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Descrição</Label><Textarea name="description" defaultValue={event?.description} /></div>
          <DialogFooter className="pt-4"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Alterações"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
