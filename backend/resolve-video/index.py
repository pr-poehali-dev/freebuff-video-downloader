import json
import re
from typing import Dict, Any

import yt_dlp

YOUTUBE_PATTERN = re.compile(
    r'(youtube\.com/watch|youtu\.be/|youtube\.com/shorts/|youtube\.com/embed/)',
    re.IGNORECASE,
)


def _pick_format(quality: str) -> str:
    # Используем только progressive-форматы (видео+аудио в одном файле).
    # Adaptive (bestvideo+bestaudio) требует ffmpeg для склейки — его нет на сервере.
    # Progressive доступен максимум до 720p — ограничение YouTube.
    h_map = {'4K': 720, '1080p': 720, '720p': 720, '480p': 480}
    h = h_map.get(quality, 720)
    return (
        f'best[height<={h}][ext=mp4]/'
        f'best[height<={h}]/'
        f'best[ext=mp4]/'
        f'best'
    )


def _extract_direct_url(info: dict) -> str:
    for rd in (info.get('requested_downloads') or []):
        u = rd.get('url')
        if u:
            return u
    for rf in (info.get('requested_formats') or []):
        u = rf.get('url')
        if u:
            return u
    if info.get('url'):
        return info['url']
    for f in reversed(info.get('formats') or []):
        if f.get('url'):
            return f['url']
    return ''


def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """
    Принимает ссылку на YouTube-видео и возвращает прямую ссылку на скачивание,
    название, превью и качество. Поддерживаются только ссылки YouTube.
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

    if not YOUTUBE_PATTERN.search(url):
        return {'statusCode': 400, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Поддерживается только YouTube. Вставьте ссылку вида youtube.com/watch?v=... или youtu.be/...'})}

    ydl_opts = {
        'format': _pick_format(quality),
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'noplaylist': True,
        'socket_timeout': 15,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as exc:
        msg = str(exc)
        if 'private' in msg.lower() or 'login' in msg.lower() or 'sign in' in msg.lower():
            human = 'Видео приватное или требует авторизации — скачивание недоступно.'
        elif 'unavailable' in msg.lower() or 'not available' in msg.lower():
            human = 'Видео недоступно. Возможно, оно удалено или заблокировано в вашем регионе.'
        else:
            human = 'Не удалось получить видео. Проверьте ссылку и попробуйте снова.'
        return {'statusCode': 422, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': human})}

    direct_url = _extract_direct_url(info)
    if not direct_url:
        return {'statusCode': 422, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Не удалось получить ссылку на файл. Попробуйте другое качество.'})}

    actual_height = None
    for rf in (info.get('requested_formats') or []):
        if rf.get('height'):
            actual_height = rf['height']
            break
    if not actual_height:
        actual_height = info.get('height')

    return {
        'statusCode': 200,
        'headers': {**cors, 'Content-Type': 'application/json'},
        'body': json.dumps({
            'title': info.get('title') or 'Видео',
            'thumbnail': info.get('thumbnail'),
            'duration': info.get('duration'),
            'extractor': 'YouTube',
            'downloadUrl': direct_url,
            'quality': f'{actual_height}p' if actual_height else quality,
            'ext': info.get('ext') or 'mp4',
        }),
    }