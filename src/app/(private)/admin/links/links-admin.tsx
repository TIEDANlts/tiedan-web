"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit, GripVertical, LinkIcon, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createLinkAction,
  deleteLinkAction,
  reorderLinksAction,
  updateLinkAction,
  type LinkActionState,
} from "@/modules/links/actions";
import type { LinkRecord } from "@/modules/links/utils";
import { cn } from "@/lib/utils";

type LinkGroup = {
  group: string;
  links: LinkRecord[];
};

const initialState: LinkActionState = {
  ok: false,
  message: null,
};

function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="text-xs text-destructive">{children}</p>;
}

function LinkForm({
  link,
  onDone,
}: {
  link?: LinkRecord;
  onDone: () => void;
}) {
  const action = link ? updateLinkAction : createLinkAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.ok) {
      onDone();
    }
  }, [onDone, state.ok]);

  return (
    <form action={formAction} className="space-y-4">
      {link ? <input type="hidden" name="id" value={link.id} /> : null}

      <label className="block space-y-2 text-sm font-medium text-ink">
        <span>分组</span>
        <Input name="group" defaultValue={link?.group ?? ""} className="bg-surface" />
        <FieldError>{state.errors?.group}</FieldError>
      </label>

      <label className="block space-y-2 text-sm font-medium text-ink">
        <span>标题</span>
        <Input name="title" defaultValue={link?.title ?? ""} className="bg-surface" />
        <FieldError>{state.errors?.title}</FieldError>
      </label>

      <label className="block space-y-2 text-sm font-medium text-ink">
        <span>URL</span>
        <Input name="url" defaultValue={link?.url ?? ""} className="bg-surface" />
        <FieldError>{state.errors?.url}</FieldError>
      </label>

      <label className="block space-y-2 text-sm font-medium text-ink">
        <span>图标</span>
        <Input
          name="icon"
          defaultValue={link?.icon ?? ""}
          placeholder="留空会自动抓取 favicon"
          className="bg-surface"
        />
        <FieldError>{state.errors?.icon}</FieldError>
      </label>

      <label className="block space-y-2 text-sm font-medium text-ink">
        <span>描述</span>
        <textarea
          name="description"
          defaultValue={link?.description ?? ""}
          rows={3}
          className="w-full resize-none rounded-lg border border-input bg-surface px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>

      {state.message && !state.ok ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "正在保存..." : "保存"}
        </Button>
      </div>
    </form>
  );
}

function LinkDialog({ link }: { link?: LinkRecord }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {link ? (
          <Button type="button" variant="outline" size="sm">
            <Edit className="size-3.5" />
            编辑
          </Button>
        ) : (
          <Button type="button">
            <Plus className="size-4" />
            新增链接
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{link ? "编辑链接" : "新增链接"}</DialogTitle>
          <DialogDescription>
            图标可以留空，系统会尝试从目标网站抓取 favicon 并缓存到本地。
          </DialogDescription>
        </DialogHeader>
        <LinkForm link={link} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function Favicon({ link }: { link: LinkRecord }) {
  if (link.icon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={link.icon} alt="" className="size-8 rounded-md object-contain" loading="lazy" />
    );
  }

  return (
    <span className="flex size-8 items-center justify-center rounded-md bg-module-links text-xs font-semibold text-white">
      {link.title.slice(0, 1).toUpperCase()}
    </span>
  );
}

function SortableLinkRow({
  link,
  onDelete,
}: {
  link: LinkRecord;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "grid gap-3 rounded-lg border border-border bg-surface p-3 shadow-sm sm:grid-cols-[auto_1fr_auto]",
        isDragging && "relative z-10 opacity-80 ring-2 ring-primary/30",
      )}
    >
      <button
        type="button"
        className="flex size-8 cursor-grab items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
        aria-label={`拖拽排序：${link.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <div className="flex min-w-0 items-start gap-3">
        <Favicon link={link} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-ink">{link.title}</h3>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <LinkIcon className="size-3" />
              打开
            </a>
          </div>
          <p className="mt-1 break-all text-xs text-ink-3">{link.url}</p>
          {link.description ? (
            <p className="mt-2 text-sm leading-6 text-ink-2">{link.description}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:justify-end">
        <LinkDialog link={link} />
        <ConfirmDialog
          trigger={
            <Button type="button" variant="outline" size="sm">
              <Trash2 className="size-3.5" />
              删除
            </Button>
          }
          title="删除这个链接？"
          description={`「${link.title}」会从公开导航页移除。`}
          confirmLabel="删除"
          onConfirm={() => onDelete(link.id)}
        />
      </div>
    </div>
  );
}

function SortableGroup({ group }: { group: LinkGroup }) {
  const [items, setItems] = useState(group.links);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const nextItems = arrayMove(items, oldIndex, newIndex);

    setItems(nextItems);
    startTransition(async () => {
      await reorderLinksAction(group.group, nextItems.map((item) => item.id));
    });
  }

  function handleDelete(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    startTransition(async () => {
      await deleteLinkAction(id);
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-ink">{group.group}</h2>
          <p className="mt-1 text-sm text-ink-2">{items.length} 个链接</p>
        </div>
        {isPending ? <span className="text-xs text-ink-3">正在保存顺序...</span> : null}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map((link) => (
              <SortableLinkRow key={link.id} link={link} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}

export function LinksAdmin({ groups }: { groups: LinkGroup[] }) {
  const total = useMemo(() => groups.reduce((sum, group) => sum + group.links.length, 0), [groups]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-primary">导航管理</p>
          <h1 className="font-heading text-3xl font-semibold text-ink">管理公开导航</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-2">
            维护公开 `/nav` 页面展示的分组链接。拖动同一分组内的链接即可保存顺序。
          </p>
        </div>
        <LinkDialog />
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-12 text-center">
          <h2 className="font-heading text-xl font-semibold text-ink">导航还空着。</h2>
          <p className="mt-2 text-sm leading-6 text-ink-2">先添加几个常用链接，再回到公开页检查展示效果。</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <SortableGroup
              key={`${group.group}:${group.links.map((link) => `${link.id}:${link.sort}`).join("|")}`}
              group={group}
            />
          ))}
        </div>
      )}
    </div>
  );
}
