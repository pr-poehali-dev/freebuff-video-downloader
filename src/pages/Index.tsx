import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const RESOLVE_URL = 'https://functions.poehali.dev/4872103e-71e8-4dab-b8ab-9aee2f969f91';

interface GalleryItem {
  src: string;
  title: string;
  meta: string;
  source: string;
  downloadUrl?: string;
}

const PLATFORMS = [
  { name: 'Instagram', icon: 'Instagram' },
  { name: 'Pinterest', icon: 'Image' },
  { name: 'YouTube', icon: 'Youtube' },
  { name: 'TikTok', icon: 'Music2' },
];

const FORMATS = ['MP4', 'WEBM'];
const QUALITIES = ['4K', '1080p', '720p', '480p'];

const INITIAL_GALLERY: GalleryItem[] = [
  {
    src: 'https://cdn.poehali.dev/projects/51d1139b-dd5b-473a-a7dc-3508c0322b6f/files/8f4c0813-5bf9-4cf0-97b3-605a393341e5.jpg',
    title: 'Утренний ритуал',
    meta: 'MP4 · 1080p',
    source: 'Instagram',
  },
  {
    src: 'https://cdn.poehali.dev/projects/51d1139b-dd5b-473a-a7dc-3508c0322b6f/files/1de6d98b-bdd8-4d4c-965b-72323eeded6e.jpg',
    title: 'Пустыня на закате',
    meta: 'MP4 · 4K',
    source: 'YouTube',
  },
  {
    src: 'https://cdn.poehali.dev/projects/51d1139b-dd5b-473a-a7dc-3508c0322b6f/files/4a06447a-81be-4a1b-ae80-3a94804083ff.jpg',
    title: 'Тихая композиция',
    meta: 'WEBM · 720p',
    source: 'Pinterest',
  },
];

const STORAGE_KEY = 'savevideo_gallery';

const loadGallery = (): GalleryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as GalleryItem[];
  } catch (e) { /* ignore */ }
  return INITIAL_GALLERY;
};

const saveGallery = (items: GalleryItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) { /* ignore */ }
};

const Index = () => {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('MP4');
  const [quality, setQuality] = useState('1080p');
  const [loading, setLoading] = useState(false);
  const [gallery, setGallery] = useState<GalleryItem[]>(loadGallery);

  const triggerDownload = (fileUrl: string, name: string) => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = `${name}.${format.toLowerCase()}`;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownload = async () => {
    if (!url.trim()) {
      toast({ title: 'Вставьте ссылку на видео', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(RESOLVE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), quality, format }),
      });
      const data = await res.json();
      if (!res.ok || !data.downloadUrl) {
        throw new Error(data.error || 'Не удалось подготовить файл');
      }

      const newItem: GalleryItem = {
        src: data.thumbnail || INITIAL_GALLERY[0].src,
        title: data.title || 'Видео',
        meta: `${data.ext?.toUpperCase() || format} · ${data.quality || quality}`,
        source: data.extractor || 'Видео',
        downloadUrl: data.downloadUrl,
      };
      setGallery((prev) => {
        const updated = [newItem, ...prev];
        saveGallery(updated);
        return updated;
      });
      triggerDownload(data.downloadUrl, data.title || 'video');
      toast({ title: 'Готово', description: 'Файл добавлен в галерею и скачивается.' });
      setUrl('');
    } catch (e) {
      toast({
        title: 'Не получилось',
        description: e instanceof Error ? e.message : 'Проверьте ссылку и попробуйте снова.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container flex items-center justify-between py-6">
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl tracking-tight">SaveVideo</span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-1">
              Studio
            </span>
          </div>
          <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
            <a href="#upload" className="hover:text-foreground transition-colors">Загрузка</a>
            <a href="#gallery" className="hover:text-foreground transition-colors">Галерея</a>
          </nav>
        </div>
      </header>

      {/* Hero + Upload */}
      <section id="upload" className="container py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center animate-fade-in">
          <p className="mb-6 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Instagram · Pinterest · YouTube · TikTok
          </p>
          <h1 className="font-display text-5xl leading-[1.05] md:text-7xl">
            Сохраняйте видео
            <br />
            <span className="italic text-accent">красиво и без суеты</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            Вставьте ссылку — выберите формат и качество. Мы бережно подготовим файл
            в галерейной тишине.
          </p>
        </div>

        {/* Upload card */}
        <div
          className="mx-auto mt-14 max-w-2xl rounded-lg border border-border bg-card p-6 md:p-8 animate-fade-in"
          style={{ animationDelay: '0.15s' }}
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Icon
                name="Link"
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
                placeholder="Вставьте ссылку на видео…"
                className="h-12 border-border bg-background pl-9 text-base"
              />
            </div>
            <Button
              onClick={handleDownload}
              disabled={loading}
              className="h-12 gap-2 bg-primary px-8 text-primary-foreground hover:bg-primary/90"
            >
              <Icon name={loading ? 'Loader2' : 'ArrowDownToLine'} size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Готовим…' : 'Скачать'}
            </Button>
          </div>

          {/* Format & Quality */}
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Формат
              </p>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`rounded-sm border px-4 py-2 text-sm transition-colors ${
                      format === f
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-border text-muted-foreground hover:border-accent/50'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Качество
              </p>
              <div className="flex flex-wrap gap-2">
                {QUALITIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`rounded-sm border px-4 py-2 text-sm transition-colors ${
                      quality === q
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-border text-muted-foreground hover:border-accent/50'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Platforms */}
        <div className="mx-auto mt-16 flex max-w-2xl flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {PLATFORMS.map((p) => (
            <div key={p.name} className="flex items-center gap-2 text-muted-foreground">
              <Icon name={p.icon} size={18} />
              <span className="text-sm tracking-wide">{p.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="border-t border-border bg-secondary/40">
        <div className="container py-20 md:py-28">
          <div className="mb-14 flex items-end justify-between">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Коллекция
              </p>
              <h2 className="font-display text-4xl md:text-5xl">Ваша галерея</h2>
            </div>
            <div className="flex flex-col items-end gap-3">
              <p className="hidden max-w-xs text-sm text-muted-foreground md:block">
                Скачанные видео хранятся здесь — как экспонаты в тихом зале.
              </p>
              <button
                onClick={() => {
                  setGallery(INITIAL_GALLERY);
                  saveGallery(INITIAL_GALLERY);
                  toast({ title: 'Галерея очищена' });
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
              >
                <Icon name="Trash2" size={13} />
                Очистить
              </button>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((item, i) => (
              <figure
                key={`${item.title}-${i}`}
                className="group hover-lift animate-fade-in"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className="relative overflow-hidden rounded-sm border border-border bg-card">
                  <img
                    src={item.src}
                    alt={item.title}
                    className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <button
                    onClick={() => {
                      const updated = gallery.filter((_, idx) => idx !== i);
                      setGallery(updated);
                      saveGallery(updated);
                    }}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-sm border border-border/60 bg-card/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-all duration-200 hover:border-destructive/60 hover:text-destructive group-hover:opacity-100"
                    title="Удалить из галереи"
                  >
                    <Icon name="X" size={14} />
                  </button>
                </div>
                <figcaption className="mt-4 flex items-start justify-between">
                  <div>
                    <p className="font-display text-xl">{item.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                      {item.source} · {item.meta}
                    </p>
                  </div>
                  {item.downloadUrl && (
                    <a
                      href={item.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="mt-1 text-muted-foreground transition-colors hover:text-accent"
                    >
                      <Icon name="ArrowDownToLine" size={18} />
                    </a>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-4 py-10 text-sm text-muted-foreground md:flex-row">
          <span className="font-display text-lg text-foreground">SaveVideo Studio</span>
          <span>© 2026 · Тихое место для ваших видео</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;