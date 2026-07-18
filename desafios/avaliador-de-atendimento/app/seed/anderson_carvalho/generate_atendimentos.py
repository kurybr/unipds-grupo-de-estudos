from pathlib import Path

def build_chat(index, customer_mood, service_quality, problem, outcome, console, game):
    lines = []
    lines.append(f"Cliente: Olá, preciso de ajuda com o pedido do {console}.")
    if customer_mood == "nervoso":
        lines.append("Cliente: Estou bem nervoso porque isso é urgente e já esperei demais.")
    elif customer_mood == "calmo":
        lines.append("Cliente: Tudo bem, posso explicar o meu problema com calma.")
    else:
        lines.append("Cliente: Quero uma resposta prática e objetiva, por favor.")

    lines.append("Atendente: Olá, sou Anderson Carvalho. Vou te ajudar com isso agora.")

    if problem == "estoque":
        lines.append(f"Cliente: O site mostra que o {console} está em estoque, mas não consigo finalizar a compra.")
        if service_quality == "bom":
            lines.append("Atendente: Estou verificando. Consegui ver que há unidades disponíveis, só falta confirmar seus dados.")
        else:
            lines.append("Atendente: Hum... parece que tem uma falha no sistema, vou tentar novamente.")

    elif problem == "pagamento":
        lines.append(f"Cliente: Paguei o {game} para o {console} e não recebi a confirmação.")
        if service_quality == "bom":
            lines.append("Atendente: Já localizei o seu pagamento. Vou reemitir o comprovante e te envio em seguida.")
        else:
            lines.append("Atendente: Esse tipo de erro precisa de um tempo maior, vou consultar o financeiro.")

    elif problem == "entrega":
        lines.append(f"Cliente: Meu pedido do {game} está atrasado e ninguém me retornou.")
        if service_quality == "bom":
            lines.append("Atendente: Entendo. Já falei com o transportador e coloquei sua entrega em prioridade.")
        else:
            lines.append("Atendente: Tá, vou ver qual o problema. Aguarde um instante, por favor.")

    elif problem == "defeito":
        lines.append(f"Cliente: O controle do {console} chegou com defeito e quero trocar.")
        if service_quality == "bom":
            lines.append("Atendente: Vou abrir a solicitação de troca imediata. Você receberá o e-mail com instruções.")
        else:
            lines.append("Atendente: Preciso checar se temos estoque para troca. Pode ficar um pouco mais de tempo? ")

    elif problem == "cadastro":
        lines.append("Cliente: Não consigo concluir meu cadastro. Diz que o CPF já existe.")
        if service_quality == "bom":
            lines.append("Atendente: Já encontrei o conflito no sistema e estou corrigindo. Logo você poderá finalizar.")
        else:
            lines.append("Atendente: Isso parece um erro do sistema. Vou confirmar com o suporte técnico.")

    elif problem == "compatibilidade":
        lines.append(f"Cliente: O jogo {game} não inicia no meu {console}.")
        if service_quality == "bom":
            lines.append("Atendente: Vou te orientar com alguns testes. Se não funcionar, abrimos a assistência técnica.")
        else:
            lines.append("Atendente: Isso é chato, mas não sei se consigo resolver agora. Aguarde um momento.")

    elif problem == "promocao":
        lines.append("Cliente: A promoção do console acabou e quero saber se ainda tenho alguma vantagem.")
        if service_quality == "bom":
            lines.append("Atendente: Consegui um cupom para frete grátis e desconto em jogos selecionados.")
        else:
            lines.append("Atendente: Promoções variam muito. Talvez não seja possível agora.")

    elif problem == "bundle":
        lines.append(f"Cliente: Quero comprar o bundle com {game} para o {console}.")
        if service_quality == "bom":
            lines.append("Atendente: Encontrei o bundle disponível e apliquei o desconto especial para você.")
        else:
            lines.append("Atendente: Preciso confirmar o estoque do bundle. Um momento.")

    elif problem == "troca":
        lines.append("Cliente: Recebi um produto diferente do que pedi e quero trocar.")
        if service_quality == "bom":
            lines.append("Atendente: Já registrei a troca e a coleta do produto errado será agendada.")
        else:
            lines.append("Atendente: Vou verificar a disponibilidade para troca, mas pode demorar um pouco.")

    lines.append("Cliente: Você pode falar de forma mais direta sobre a solução?")
    if service_quality == "bom":
        lines.append("Atendente: Claro. Resolvi seu caso e enviei os detalhes para o e-mail cadastrado.")
        if problem == "entrega":
            lines.append("Atendente: Sua entrega teve prioridade. Devo confirmar se chegará por volta de amanhã.")
        elif problem == "compatibilidade":
            lines.append("Atendente: Após reconectar sua conta, o jogo abriu normalmente.")
    else:
        lines.append("Atendente: Estou tentando, mas ainda não tenho uma solução definitiva.")
        if problem == "pagamento":
            lines.append("Atendente: O financeiro deve responder em breve para liberar a confirmação.")
        elif problem == "cadastro":
            lines.append("Atendente: O suporte técnico está vendo o problema de CPF duplicado.")

    if service_quality == "bom":
        lines.append("Cliente: Obrigado, você me ajudou muito.")
        lines.append("Atendente: Disponha! Fico feliz em ajudar.")
    else:
        lines.append("Cliente: Estou frustrado, mas espero que isso seja resolvido.")
        lines.append("Atendente: Desculpe pelo transtorno, estou fazendo o possível.")

    if outcome:
        lines.append("Cliente: Sim, o problema foi solucionado. Obrigado.")
    else:
        lines.append("Cliente: Não, ainda não foi solucionado.")
    lines.append("Atendente: Por favor, dê uma nota para o atendimento de 1 a 5 e confirme se o problema foi solucionado.")

    return "\n".join(lines) + "\n"


def main():
    base = Path(r"C:\dev\AI\Laboratorio\unipds-grupo-de-estudos\desafios\avaliador-de-atendimento\app\seed\anderson_carvalho")
    base.mkdir(parents=True, exist_ok=True)
    moods = ["nervoso", "calmo", "neutro"]
    qualities = ["bom", "cansado"]
    problems = ["estoque", "pagamento", "entrega", "defeito", "cadastro", "compatibilidade", "promocao", "bundle", "troca", "recomendacao"]
    outcomes = [True, False]
    consoles = ["PlayStation 5", "Xbox Series X", "Xbox Series S", "Nintendo Switch OLED"]
    games = ["Horizon Forbidden West", "God of War Ragnarök", "The Legend of Zelda: Tears of the Kingdom", "Elden Ring", "Spider-Man 2", "FIFA 24", "Resident Evil 4", "Cyberpunk 2077", "Super Mario Odyssey", "Starfield"]

    for i in range(1, 51):
        mood = moods[i % len(moods)]
        quality = qualities[i % len(qualities)]
        problem = problems[i % len(problems)]
        outcome = outcomes[i % len(outcomes)]
        console = consoles[i % len(consoles)]
        game = games[i % len(games)]
        suffix = "resolvido" if outcome else "nao-resolvido"
        filename = f"{i:02d}-{problem}-{mood}-{quality}-{suffix}.txt"
        content = build_chat(i, mood, quality, problem, outcome, console, game)
        (base / filename).write_text(content, encoding="utf-8")

    written = len(list(base.glob("*.txt")))
    print(f"Escreveu {written} arquivos em {base}")


if __name__ == "__main__":
    main()
