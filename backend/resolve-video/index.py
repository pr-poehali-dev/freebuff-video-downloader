import json
from typing import Dict, Any

import yt_dlp


def _pick_format(quality: str) -> str:
    """Возвращает строку формата yt-dlp для нужного качества.
    Всегда запрашиваем объединённый mp4 (видео+аудио в одном файле),
    чтобы браузер мог скачать без перекодировки."""
    h_map = {'4K': 2160, '1080p': 1080, '720p': 720, '480p': 480}
    h = h_map.get(quality, 1080)
    return (
        f'bestvideo[height<={h}][ext=mp4]+bestaudio[ext=m4a]/'
        f'bestvideo[height<={h}]+bestaudio/'
        f'best[height<={h}][ext=mp4]/'
        f'best[height<={h}]/'
        f'best'
    )


def _extract_direct_url(info: dict) -> str:
    """Вытаскивает прямой URL из info-объекта yt-dlp."""
    # После merge форматов url живёт в requested_formats или requested_downloads
    for rd in (info.get('requested_downloads') or []):
        u = rd.get('url') or rd.get('webpage_url')
        if u:
            return u
    for rf in (info.get('requested_formats') or []):
        u = rf.get('url')
        if u:
            return u
    if info.get('url'):
        return info['url']
    formats = info.get('formats') or []
    for f in reversed(formats):
        if f.get('url'):
            return f['url']
    return ''


def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """
    Принимает ссылку на видео (Instagram, Pinterest, YouTube, TikTok)
    и возвращает прямую ссылку на скачивание, название, превью и платформу.
    Body: {url: str, quality: str}  quality = 4K | 1080p | 720p | 480p
    """
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    url = (body.get('url') or '').strip()
    quality = (body.get('quality') or '1080p').strip()

    if not url:
        return {'statusCode': 400, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Укажите ссылку на видео'})}

    ydl_opts = {
        'format': _pick_format(quality),
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'noplaylist': True,
        'extract_flat': False,
        'http_headers': {
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/124.0.0.0 Safari/537.36'
            )
        },
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as exc:
        msg = str(exc)
        if 'Private' in msg or 'login' in msg.lower():
            human = 'Видео приватное или требует авторизации — скачивание недоступно.'
        elif 'Unsupported URL' in msg:
            human = 'Ссылка не поддерживается. Проверьте, что она ведёт на Instagram, YouTube, TikTok или Pinterest.'
        else:
            human = 'Не удалось обработать ссылку. Проверьте её и попробуйте снова.'
        return {'statusCode': 422, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': human})}

    direct_url = _extract_direct_url(info)

    # Определяем реальное качество из выбранного формата
    actual_height = None
    for rf in (info.get('requested_formats') or []):
        if rf.get('height'):
            actual_height = rf['height']
            break
    if not actual_height:
        actual_height = info.get('height')

    result = {
        'title': info.get('title') or 'Видео',
        'thumbnail': info.get('thumbnail'),
        'duration': info.get('duration'),
        'extractor': info.get('extractor_key') or info.get('extractor') or 'Video',
        'downloadUrl': direct_url,
        'quality': f'{actual_height}p' if actual_height else quality,
        'ext': info.get('ext') or 'mp4',
    }

    return {
        'statusCode': 200,
        'headers': {**cors, 'Content-Type': 'application/json'},
        'body': json.dumps(result),
    }
