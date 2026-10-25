"""Small configuration-driven renderer for cover, image and text presentations."""
from pathlib import Path
from html import escape
import hashlib
import json
import os
from urllib.parse import urljoin

RUNTIME = ('config.js','presentation.css','slides.css','live.css','presentation.js','app.js','live.js')
LABELS = {
'en':{'summary':'Slide summary','help':'Select Present. Use arrow keys to navigate, Escape to exit, and L to switch language. On touchscreens, tap the right or left half of a slide.','iphone':'On iPhone: Share → Add to Home Screen → Open as Web App to hide browser bars.'},
'ar':{'summary':'ملخص الشريحة','help':'اختر «عرض». استخدم الأسهم للتنقل وEsc للخروج وL لتغيير اللغة. على شاشة اللمس، اضغط يمين الشريحة أو يسارها.','iphone':'على iPhone: مشاركة ← إضافة إلى الشاشة الرئيسية ← فتح كتطبيق ويب لإخفاء أشرطة المتصفح.'},
'zh':{'summary':'幻灯片摘要','help':'选择“演示”。用方向键翻页，Esc 退出，L 切换语言。在触摸屏上，点按幻灯片左半边或右半边翻页。','iphone':'在 iPhone 上：分享 → 添加到主屏幕 → 作为网页 App 打开，即可隐藏浏览器栏。'},
'de':{'summary':'Folienzusammenfassung','help':'Präsentieren wählen. Pfeiltasten zum Blättern, Escape zum Beenden, L zum Sprachwechsel. Auf Touchscreens links oder rechts auf die Folie tippen.','iphone':'Auf dem iPhone: Teilen → Zum Home-Bildschirm → Als Web-App öffnen.'},
}


def safe_json(value):
    return json.dumps(value, ensure_ascii=False).replace('<','\\u003c')


def localized(config, values, tag='span', classes='', attrs=''):
    if isinstance(values, str): values={config['languages'][0]['code']:values}
    result=[]
    for index, lang in enumerate(config['languages']):
        code=lang['code'];value=values.get(code,'')
        cls=('lang-en' if index==0 else 'lang-ar')+' '+classes
        result.append(f'<{tag} class="{cls.strip()}" data-language="{code}" lang="{lang.get("htmlLang",code)}" dir="{lang.get("dir","ltr")}" {attrs}>{escape(str(value)).replace(chr(10),"<br>")}</{tag}>')
    return ''.join(result)


def asset_url(root, output, name):
    path=root/name
    if not path.resolve().is_relative_to(root.resolve()): raise ValueError(name)
    digest=hashlib.sha256(path.read_bytes()).hexdigest()[:12]
    return Path(os.path.relpath(path,output.parent)).as_posix()+'?v='+digest


def config_script(config):
    return '<script id="presentation-config" type="application/json">'+safe_json(config)+'</script>'


def render(root, config_path):
    root=root.resolve();config=json.loads(config_path.read_text());output=root/config.get('output','index.html')
    slides=json.loads((root/config.get('slides','slides.json')).read_text())
    primary=config['languages'][0]['code'];languages=config['languages']
    prefix=Path(os.path.relpath(root,output.parent)).as_posix()
    prefix='' if prefix=='.' else prefix+'/'
    get=lambda slide,key:{lang['code']:slide.get(key+'_'+lang['code'],slide.get(key,'') if i==0 else '') for i,lang in enumerate(languages)}
    parts=[]
    for n,slide in enumerate(slides,1):
        titles=get(slide,'title');summaries=get(slide,'summary')
        if slide.get('image'):
            image=escape(prefix+slide['image'],quote=True)
            visual=f'<img src="{image}" alt="{escape(summaries[primary],quote=True)}" width="1672" height="941" loading="eager">'
            if config.get('captions',True):
                captions=[]
                for i,lang in enumerate(languages):
                    code=lang['code'];caption=slide.get('caption_'+code,{'lead':titles[code],'rest':summaries[code]})
                    gap='' if code=='zh' else ' '
                    captions.append(f'<div class="caption-language-row {"lang-en" if i==0 else "lang-ar"}" data-language="{code}" lang="{lang.get("htmlLang",code)}" dir="{lang.get("dir","ltr")}"><strong>{escape(caption["lead"])}</strong>{gap}<span>{escape(caption["rest"])}</span></div>')
                visual+='<aside class="caption" aria-label="Slide caption">'+''.join(captions)+'</aside>'
            stage='<div class="slide-stage image-slide">'+visual+'</div>'
        elif slide.get('kind')=='text':
            stage='<div class="slide-stage text-slide statement"><div class="slide-titles">'+localized(config,titles,'h2')+'</div><div class="statement-body">'+localized(config,summaries)+'</div></div>'
        else:
            cover=config.get('cover',{})
            heading=[]
            for i,lang in enumerate(languages):
                code=lang['code'];title=cover.get('title',titles).get(code,titles.get(code,''))
                heading.append(f'<h1 class="{"lang-en" if i==0 else "title-ar lang-ar"}" data-language="{code}" lang="{lang.get("htmlLang",code)}" dir="{lang.get("dir","ltr")}">{escape(title).replace(chr(10),"<br>")}</h1>')
            stage='<div class="slide-stage cover">'+''.join(heading)+'<div class="cover-subtitle">'+localized(config,cover.get('subtitle',summaries))+'</div><div class="speaker">'+localized(config,cover.get('speaker',{}))+'</div></div>'
        summary_labels={lang['code']:LABELS.get(lang['code'],LABELS['en'])['summary'] for lang in languages}
        notes='<details class="notes"><summary>'+localized(config,summary_labels)+'</summary><div class="notes-body">'+localized(config,summaries,'p')+'</div></details>'
        parts.append(f'<section id="slide-{n:02}" aria-labelledby="title-{n}"><div class="slide-heading"><span>{n:02} / {len(slides):02}</span><h2 id="title-{n}">'+localized(config,titles)+'</h2></div>'+stage+notes+'</section>')
    css=''.join(f'<link rel="stylesheet" href="{asset_url(root,output,".presentation-kit/runtime/"+name)}">' for name in ('presentation.css','slides.css','live.css'))
    if (root/'theme.css').exists(): css+=f'<link rel="stylesheet" href="{asset_url(root,output,"theme.css")}">'
    css+=f'<link rel="license" href="{asset_url(root,output,".presentation-kit/runtime/LICENSE")}">'
    css+=f'<link rel="license" href="{asset_url(root,output,".presentation-kit/runtime/assets/fonts/OFL.txt")}">'
    css+=f'<link rel="license" href="{asset_url(root,output,".presentation-kit/runtime/assets/fonts/OpenRunde-OFL.txt")}">'
    scripts=config_script(config)+''.join(f'<script src="{asset_url(root,output,".presentation-kit/runtime/"+name)}"></script>' for name in ('config.js','presentation.js','app.js','live.js'))
    meta=''
    if config.get('shareUrl'):
        meta+=f'<meta property="og:title" content="{escape(config["title"],quote=True)}"><meta property="og:type" content="website"><meta property="og:url" content="{escape(config["shareUrl"],quote=True)}"><meta property="og:description" content="{escape(config.get("description",""),quote=True)}">'
        if config.get('shareImage'):
            image=urljoin(config['shareUrl'],asset_url(root,output,config['shareImage']))
            meta+=f'<meta property="og:image" content="{escape(image,quote=True)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="675"><meta name="twitter:card" content="summary_large_image">'
    help_text={lang['code']:LABELS.get(lang['code'],LABELS['en'])['help'] for lang in languages}
    iphone={lang['code']:LABELS.get(lang['code'],LABELS['en'])['iphone'] for lang in languages}
    extra_links=''.join(f'<a href="{escape(prefix+link["href"],quote=True)}">{escape(link["label"])}</a> ' for link in config.get('links',[]))
    html=f'<!doctype html><html lang="{primary}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#ffffff"><title>{escape(config["title"])}</title><meta name="description" content="{escape(config.get("description",""),quote=True)}">{meta}{css}</head><body data-caption-mode="{config.get("defaultMode","both")}"><header id="top"><h1>{localized(config,config.get("heading",{primary:config["title"]}))}</h1><p>{localized(config,help_text)}</p><p class="iphone-tip" hidden>{localized(config,iphone)}</p>{extra_links}</header><main>'+''.join(parts)+f'</main><footer>{escape(config["title"])}</footer><div class="controls" aria-label="Slide navigation"><a id="prev" href="#slide-01" aria-label="Previous slide">←</a><a href="#top" aria-label="Back to top">↑</a><a id="next" href="#slide-02" aria-label="Next slide">→</a></div>{scripts}</body></html>'
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(html)
    return output,html
