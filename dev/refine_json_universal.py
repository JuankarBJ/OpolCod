import json
import re
import os

normas_dir = r'c:\JuanCarlosASUS\ProyectosWeb\OpolCod\OpolCod\data\normas'
fecha_defecto = 'Codificado 11 febrero 2026'

possible_keywords = ['Titular', 'Conductor', 'Pasajero', 'Usuario', 'Propietario', 'Taller', 'Otros', 'Arrendatario', 'Acompañante']

def refine_file(file_path):
    print(f"Processing {os.path.basename(file_path)}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except Exception as e:
            print(f"  Error loading JSON: {e}")
            return

    # 1. Update/Add update date if not present
    if 'fecha_actualizacion' not in data:
        data['fecha_actualizacion'] = fecha_defecto

    # 2. Refine infractions
    for inf in data.get('infracciones', []):
        desc = inf.get('descripcion', '')
        
        # Check if we should try to extract (only if nota is empty/missing)
        has_ext_nota = bool(inf.get('nota'))
        has_ext_resp = bool(inf.get('responsables'))
        
        if not has_ext_nota or not has_ext_resp:
            # Try to match the "*Nota: ... Responsable: ...*" pattern
            match = re.search(r'\n\n\*Nota: (.*?)\*$', desc, re.DOTALL)
            if match:
                full_nota_block = match.group(1)
                
                # New Nota content
                new_nota = ""
                new_resps = []
                
                resp_match = re.search(r'Responsable: (.*)$', full_nota_block)
                if resp_match:
                    resp_str = resp_match.group(1).strip()
                    for kw in possible_keywords:
                        if kw in resp_str:
                            new_resps.append(kw)
                    new_nota = full_nota_block[:resp_match.start()].strip().rstrip('.')
                else:
                    new_nota = full_nota_block.strip()

                # ONLY update description and fields if we are NOT overwriting something already there
                if not has_ext_nota:
                    inf['nota'] = new_nota
                if not has_ext_resp:
                    inf['responsables'] = new_resps
                
                # Only clean description if we successfully used the note block
                inf['descripcion'] = desc[:match.start()].strip()
            else:
                # Ensure fields exist even if empty
                if 'nota' not in inf:
                    inf['nota'] = ""
                if 'responsables' not in inf:
                    inf['responsables'] = []
        
        # Ensure 'opc' exists too
        if 'opc' not in inf:
            inf['opc'] = ""

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# Get all json files but not recursively (user mentioned /normas)
for filename in os.listdir(normas_dir):
    if filename.endswith('.json'):
        refine_file(os.path.join(normas_dir, filename))

print("\nAll files processed successfully.")
