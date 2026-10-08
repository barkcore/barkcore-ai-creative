#!/usr/bin/env python3
"""Reserve one independent question before asking it; persist the count."""
import argparse
import json
import os
import tempfile
from pathlib import Path

class BudgetError(ValueError):
    pass

def read_ledger(path):
    if not path.exists():
        raise BudgetError('台帳がありません。会話履歴を確認し、初回ならinitしてください。')
    try:
        ledger = json.loads(path.read_text(encoding='utf-8'))
        asked = ledger['asked']
        if ledger['limit'] != 10 or not isinstance(asked, list) or len(asked) > 10:
            raise ValueError()
        if ledger.get('status') not in ('in_progress', 'completed'):
            raise ValueError()
        if [q['number'] for q in asked] != list(range(1, len(asked) + 1)):
            raise ValueError()
    except (ValueError, KeyError, TypeError) as e:
        raise BudgetError('台帳を復元できません。追加質問せず、未確認の初版を作ってください。') from e
    return ledger

def save(path, ledger):
    if path.is_symlink():
        raise BudgetError('台帳のシンボリックリンクには書き込みません。')
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix='.ledger-')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(ledger, f, ensure_ascii=False, indent=2)
            f.write('\n')
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)

def init(path, session_id):
    if path.exists() or path.is_symlink():
        raise BudgetError('既存台帳のリセットはできません。再開時はreserveで続けます。')
    ledger = {'version': 2, 'session_id': session_id, 'status': 'in_progress', 'limit': 10, 'asked': []}
    save(path, ledger)
    return ledger

def reserve(path, topic, question):
    ledger = read_ledger(path)
    if ledger['status'] != 'in_progress':
        raise BudgetError('この体験は完了済みです。初回の予算はリセットしません。')
    if len(ledger['asked']) >= 10:
        raise BudgetError('質問は累計10問に達しました。追加質問せず初版を保存してください。')
    if not topic.strip() or not question.strip():
        raise BudgetError('質問と項目名が必要です。')
    ledger['asked'].append({'number': len(ledger['asked']) + 1, 'topic': topic, 'question': question, 'status': 'asked'})
    save(path, ledger)
    return ledger

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['init', 'reserve', 'status'])
    parser.add_argument('--ledger', required=True, type=Path)
    parser.add_argument('--session', default='initial')
    parser.add_argument('--topic', default='')
    parser.add_argument('--question', default='')
    args = parser.parse_args()
    try:
        ledger = init(args.ledger, args.session) if args.action == 'init' else reserve(args.ledger, args.topic, args.question) if args.action == 'reserve' else read_ledger(args.ledger)
    except (BudgetError, OSError) as e:
        parser.exit(1, str(e) + '\n')
    print(json.dumps({'used': len(ledger['asked']), 'remaining': 10 - len(ledger['asked']), 'status': ledger['status']}, ensure_ascii=False))

if __name__ == '__main__':
    main()
