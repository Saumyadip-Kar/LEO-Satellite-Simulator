from PIL import Image

# Load image
img = Image.open("Texture/World_Map.svg")

# Create a new canvas with desired size
canvas = Image.new('RGB', (500, 500), (255, 255, 255))  # 500x500 white canvas

# Define horizontal and vertical shifts
horizontal_shift = 50  # Move 50px right
vertical_shift = 20    # Move 20px down

# Paste the image onto the canvas with a shift
canvas.paste(img, (horizontal_shift, vertical_shift))

# Save or show the result
canvas.show()
