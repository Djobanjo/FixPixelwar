# Program to reset the colors of a map (2D grid)

name_file = "setting.json"
size = 100
color = "#fdf3d6"

with open(name_file, "w", encoding="utf-8") as f:
    f.write("{\n")
    f.write("  \"pixels\": [\n")

    for i in range(size*size):
        if (i!=(size*size-1)):
            f.write("    \""+color+"\",\n")
        else :
            f.write("    \""+color+"\"\n")             

    f.write("  ]\n")
    f.write("}")

