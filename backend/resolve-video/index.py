import json
from typing import Dict, Any

import yt_dlp


def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    '''
    Business: Принимает ссылку на видео из Instagram, Pinterest, YouTube или TikTok
              и возвращает прямую ссылку на скачивание в выбранном качестве, а также
              название, превью и доступные форматы.
    Args: event с httpMethod, body (json: {url, quality}); context с request_id
    Returns: HTTP-ответ с прямой ссылкой на файл и метаданными
    '''
    method: str = event.get('httpMethod', 'GET')

    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers, 'body': ''}

    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Method not allowed'}),
        }

    body_data = json.loads(event.get('body') or '{}')
    url = (body_data.get('url') or '').strip()
    quality = (body_data.get('quality') or '1080p').strip()

    if not url:
        return {
            'statusCode': 400,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Укажите ссылку на видео'}),
        }

    quality_map = {
        '4K': 'bestvideo[height<=2160]+bestaudio/best[height<=2160]/best',
        '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
        '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]/best',
        '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]/best',
    }
    fmt = quality_map.get(quality, quality_map['1080p'])

    ydl_opts = {
        'format': fmt,
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'noplaylist': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as exc:
        return {
            'statusCode': 422,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Не удалось обработать ссылку. Проверьте её и попробуйте снова.'}),
        }

    direct_url = info.get('url')
    if not direct_url and info.get('requested_downloads'):
        direct_url = info['requested_downloads'][0].get('url')
    if not direct_url and info.get('formats'):
        direct_url = info['formats'][-1].get('url')

    result = {
        'title': info.get('title') or 'Видео',
        'thumbnail': info.get('thumbnail'),
        'duration': info.get('duration'),
        'extractor': info.get('extractor_key') or info.get('extractor'),
        'downloadUrl': direct_url,
        'quality': quality,
    }

    return {
        'statusCode': 200,
        'headers': {**cors_headers, 'Content-Type': 'application/json'},
        'body': json.dumps(result),
        'isBase64Encoded': False,
    }
