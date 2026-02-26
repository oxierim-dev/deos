import re
import os

css_path = r"c:\Users\erimb\OneDrive\Masaüstü\DEOS GAME\client\style.css"

with open(css_path, "r", encoding="utf-8") as f:
    css = f.read()

# Replace root variables
css = re.sub(r'--primary-color:.*?;', '--primary-color: #ffffff;', css)
css = re.sub(r'--secondary-color:.*?;', '--secondary-color: #aaaaaa;', css)
css = re.sub(r'--bg-color:.*?;', '--bg-color: #000000;', css)
css = re.sub(r'--panel-bg:.*?;', '--panel-bg: rgba(20, 20, 20, 0.9);', css)

# Replace gradients and shadows to BW or none
css = re.sub(r'radial-gradient\(circle at center, #1a1a3a 0%, #050510 100%\)', 'linear-gradient(to bottom, #111, #000)', css)
css = re.sub(r'text-shadow: 0 0 \d+px rgba\(0, 255, 234, 0\.8\);', 'text-shadow: none;', css)
css = re.sub(r'text-shadow: 0 0 10px var\(--primary-color\);', 'text-shadow: none;', css)
css = re.sub(r'text-shadow: 0 0 10px var\(--secondary-color\);', 'text-shadow: none;', css)
css = re.sub(r'box-shadow: 0 0 \d+px var\(--primary-color\);', 'box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);', css)
css = re.sub(r'box-shadow: 0 0 \d+px rgba\(0, 255, 234, 0\.\d+\);', 'box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);', css)

# other neon colors
css = css.replace('#00ffea', '#ffffff')
css = css.replace('#ff00ff', '#888888')
css = css.replace('#ff0000', '#ffffff')
css = css.replace('#ffae00', '#aaaaaa')
css = css.replace('#ffd700', '#ffffff')
css = css.replace('#00887a', '#333333')

# track lines gradient
css = css.replace('rgba(0, 255, 234, 0.1)', 'rgba(255, 255, 255, 0.1)')

# remove glow
css = re.sub(r'text-shadow: 0 0 15px var\(--primary-color\);', 'text-shadow: none;', css)
css = re.sub(r'text-shadow: 0 0 30px #ffffff;', 'text-shadow: none;', css)
css = re.sub(r'box-shadow: 0 0 20px var\(--secondary-color\);', 'box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);', css)

with open(css_path, "w", encoding="utf-8") as f:
    f.write(css)

print("CSS transformed to Black and White.")
