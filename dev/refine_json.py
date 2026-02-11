import json
import re

file_path = r'c:\JuanCarlosASUS\ProyectosWeb\OpolCod\OpolCod\data\normas\rdl_6_2015_est.json'
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

data['fecha_actualizacion'] = '11/02/2026'

possible_keywords = ['Titular', 'Conductor', 'Pasajero', 'Usuario', 'Propietario', 'Taller', 'Otros', 'Arrendatario']

for inf in data.get('infracciones', []):
    desc = inf.get('descripcion', '')
    # Pattern: *Nota: ... Responsable: ...*
    # We want to catch the whole block at the end
    match = re.search(r'\n\n\*Nota: (.*?)\*$', desc, re.DOTALL)
    if match:
        full_nota_block = match.group(1)
        # Clean description by removing the nota block
        inf['descripcion'] = desc[:match.start()].strip()
        
        # Check for Responsable inside the block
        resp_match = re.search(r'Responsable: (.*)$', full_nota_block)
        if resp_match:
            resp_str = resp_match.group(1).strip()
            # Extract keywords
            found_resps = []
            for kw in possible_keywords:
                if kw in resp_str:
                    # Map Arrendatario to Otros or Titular? User didn't specify, but I'll stick to their list or keep it.
                    # I'll add Arrendatario to the list if it's common.
                    found_resps.append(kw)
            
            inf['responsables'] = found_resps
            # Remove Responsable part from nota
            inf['nota'] = full_nota_block[:resp_match.start()].strip().rstrip('.')
        else:
            inf['nota'] = full_nota_block.strip()
            if 'responsables' not in inf:
                inf['responsables'] = []
    else:
        if 'nota' not in inf:
            inf['nota'] = ""
        if 'responsables' not in inf:
            inf['responsables'] = []

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Refinement complete.")
