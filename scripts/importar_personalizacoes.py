"""
Importa a tabela de preços de personalização para o app.

  python scripts/importar_personalizacoes.py

- Lê arquivos-base/Tabela_Precos_Personalizacao.xlsx
- Gera src/data/personalizacoes.ts (usado por src/data/seed.ts)

Formato da planilha: blocos em sequência, cada um com
  título   "CÓDIGO — Nome"  ou  "CÓDIGO — Nome  |  Área até 20 x 26 cm"
  cabeçalho "Qtd. / Cores" (colunas = nº de cores) ou "Qtd. / Área" (colunas = área)
  linhas   quantidade mínima | preço por peça em cada coluna
Blocos com o mesmo código viram uma única técnica com várias opções (área × cores).
"""
import json
import os
import re
import unicodedata

import openpyxl

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLANILHA = os.path.join(RAIZ, 'arquivos-base', 'Tabela_Precos_Personalizacao.xlsx')
SAIDA_TS = os.path.join(RAIZ, 'src', 'data', 'personalizacoes.ts')

TITULO = re.compile(r'^\s*([A-Z0-9]+)\s+—\s+(.+?)\s*(?:\|\s*(.+))?$')


def slug(txt):
    txt = unicodedata.normalize('NFKD', txt).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '', txt.lower().replace(',', '.').replace('.', 'p'))


def area_curta(txt):
    """'Área até 20 x 26 cm' -> 'até 20 × 26 cm'; '25 x 70 mm' -> '25 × 70 mm'."""
    txt = re.sub(r'^\s*Área\s+', '', txt.strip(), flags=re.I)
    return re.sub(r'\s*x\s*', ' × ', txt)


def main():
    ws = openpyxl.load_workbook(PLANILHA, data_only=True).active
    linhas = [list(r) for r in ws.iter_rows(values_only=True)]

    tecnicas = {}  # codigo -> dict
    i = 0
    while i < len(linhas):
        a = linhas[i][0]
        m = TITULO.match(a) if isinstance(a, str) else None
        if not m or i + 1 >= len(linhas) or not str(linhas[i + 1][0] or '').startswith('Qtd.'):
            i += 1
            continue
        codigo, nome, area_bloco = m.group(1), m.group(2).strip(), m.group(3)
        cab = linhas[i + 1]
        por_cores = 'cores' in str(cab[0]).lower()
        colunas = [(j, str(c).strip()) for j, c in enumerate(cab) if j > 0 and c is not None]

        tec = tecnicas.setdefault(codigo, {'id': f'pz-{codigo.lower()}', 'codigo': codigo, 'tipo': nome, 'opcoes': []})
        opcoes = []
        for j, rotulo in colunas:
            if por_cores:
                area = area_curta(area_bloco) if area_bloco else None
                cores = int(re.match(r'\d+', rotulo).group(0))
            else:
                area, cores = area_curta(rotulo), None
            oid = '-'.join(x for x in (tec['id'], slug(area or ''), f'{cores}c' if cores else '') if x)
            opcoes.append((j, {'id': oid, 'area': area, 'cores': cores, 'faixas': []}))

        k = i + 2
        while k < len(linhas) and isinstance(linhas[k][0], (int, float)):
            qtd = int(linhas[k][0])
            for j, op in opcoes:
                v = linhas[k][j]
                if isinstance(v, (int, float)):
                    op['faixas'].append({'qtdMin': qtd, 'preco': round(float(v), 2)})
            k += 1
        tec['opcoes'].extend(op for _, op in opcoes)
        i = k

    lista = list(tecnicas.values())
    ts = (
        '/* ARQUIVO GERADO por scripts/importar_personalizacoes.py — não edite à mão.\n'
        '   Fonte: arquivos-base/Tabela_Precos_Personalizacao.xlsx\n'
        '   Preço por peça, válido a partir da quantidade indicada (qtdMin). Áreas superiores sob consulta. */\n'
        "import type { Personalization } from '../types'\n\n"
        f'export const PERSONALIZACOES: Personalization[] = {json.dumps(lista, ensure_ascii=False)}\n'
    )
    with open(SAIDA_TS, 'w', encoding='utf-8', newline='\n') as f:
        f.write(ts)
    for t in lista:
        print(f"{t['codigo']:5} {t['tipo']:28} {len(t['opcoes']):2} opções · {len(t['opcoes'][0]['faixas'])} faixas")


if __name__ == '__main__':
    main()
