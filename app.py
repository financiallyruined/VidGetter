from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import yt_dlp
import traceback

app = Flask(__name__)
CORS(app)

def get_simple_resolution(height):
    resolutions = [
        (2160, "4K"),
        (1440, "1440p"),
        (1080, "1080p"),
        (720, "720p"),
        (480, "480p"),
        (360, "360p"),
        (240, "240p"),
        (0, "144p")
    ]
    return next(label for h, label in resolutions if height >= h)

def format_size(bytes):
    """Convert bytes to human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes < 1024.0:
            return f"{bytes:.2f} {unit}"
        bytes /= 1024.0

def get_height(resolution):
    if resolution == 'N/A' or 'x' not in resolution:
        return 0
    try:
        return int(resolution.split('x')[1])
    except ValueError:
        return 0

def is_viable_format(f):
    return (
        f.get('ext', '').lower() != 'mhtml' and
        not f.get('url', '').endswith('.m3u8')
    )

def filter_formats(formats, extractor):
    filtered = []
    seen_resolutions = set()
    audio_formats = []
    is_youtube = extractor.lower() in ['youtube', 'youtubewebarchive', 'youtubeplaylist']
    
    for f in formats:
        if not is_viable_format(f):
            continue
        
        size = format_size(f.get('filesize') or f.get('filesize_approx') or 0)
        
        if f.get('vcodec') == 'none' and f.get('acodec') != 'none':
            # This is an audio-only format
            audio_formats.append({
                'format': 'audio only',
                'ext': f.get('ext', 'Unknown'),
                'resolution': 'audio',
                'url': f.get('url', 'N/A'),
                'abr': f.get('abr', 0),
                'size': size
            })
        elif f.get('height') is not None and f.get('vcodec') != 'none':
            # This is a video format
            height = f['height']
            if is_youtube and height > 1080:
                continue  # Skip resolutions higher than 1080p for YouTube
            simple_resolution = get_simple_resolution(height)
            if simple_resolution not in seen_resolutions:
                seen_resolutions.add(simple_resolution)
                filtered.append({
                    'format': simple_resolution,
                    'ext': f.get('ext', 'Unknown'),
                    'resolution': f"{f.get('width', 'N/A')}x{f.get('height', 'N/A')}",
                    'url': f.get('url', 'N/A'),
                    'size': size
                })
        else:
            # This is a format of unknown type
            filtered.append({
                'format': 'unknown',
                'ext': f.get('ext', 'Unknown'),
                'resolution': f"{f.get('width', 'N/A')}x{f.get('height', 'N/A')}",
                'url': f.get('url', 'N/A'),
                'size': size
            })
    
    # Sort video formats by resolution (height)
    filtered.sort(key=lambda x: get_height(x['resolution']), reverse=True)
    
    # Sort audio formats by bitrate
    audio_formats.sort(key=lambda x: float(x['abr']) if x['abr'] is not None else 0, reverse=True)
    
    # Take top 2 audio formats
    audio_formats = audio_formats[:2]
    
    return filtered + audio_formats

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/info', methods=['POST'])
def get_video_info():
    try:
        data = request.json
        url = data.get('url')
        if not url:
            return jsonify({"error": "URL is required"}), 400
        
        ydl_opts = {
            'skip_download': True,
            'playlist_items': '1',
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
        
        if 'entries' in info:
            if not info['entries']:
                return jsonify({"error": "No video found in playlist"}), 400
            info = info['entries'][0]
        
        extractor = info.get('extractor', '')
        formats = filter_formats(info['formats'], extractor)
        
        return jsonify({
            "title": info.get('title', 'N/A'),
            "thumbnail": info.get('thumbnail', 'N/A'),
            "duration": info.get('duration', 0),
            "formats": formats
        })
    except yt_dlp.utils.DownloadError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0")
