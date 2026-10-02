"""Teoria de Respuesta al Item (IRT), modelo logistico de 2 parametros.

Es la capa matematica del motor adaptativo. Responde a dos preguntas:

  1. Dado lo que el alumno ha respondido, ¿cual es su habilidad `theta`?
  2. Dada esa habilidad, ¿que pregunta del banco aporta mas informacion?

El modelo describe la probabilidad de acertar un item como

    P(acierto | theta) = c + (1 - c) * sigma(a * (theta - b))

donde `b` es la dificultad del item, `a` su discriminacion (como de bien separa
a quien sabe de quien no) y `c` el suelo de azar. Un item con `a` alta es una
pregunta que distingue mucho; uno con `a` baja la acierta cualquiera o no la
acierta nadie, y sirve de poco.

SOBRE LOS DOS PARAMETROS Y EL SUELO DE AZAR
-------------------------------------------
El proyecto pide el modelo logistico de DOS PARAMETROS, y eso es lo que se
estima: por cada item se ajustan exactamente dos parametros libres, `a` y `b`.
El suelo `c` no se estima, se fija a 1/4 porque todas las preguntas del banco
tienen cuatro opciones y quien no sabe nada acierta una de cada cuatro.

No es un detalle cosmetico. Al calibrar el banco ignorando la adivinanza (es
decir, con c = 0) la dificultad media recuperada salio en -0.86 en lugar de 0 y
la discriminacion media en 0.51 en lugar de 1.0: el modelo interpreta los
aciertos por azar de los alumnos flojos como que las preguntas son mas faciles
de lo que son. Con esa escala, a un alumno de habilidad media el motor le
habria servido preguntas de nivel 4. Fijando c = 0.25 la escala se recupera.

Poniendo `ADIVINANZA = 0.0` todas las formulas de abajo colapsan al 2PL puro.

Este modulo esta escrito en Python puro a proposito. La estimacion trabaja
sobre una rejilla de 61 puntos y como mucho unas decenas de items, asi que
numpy no aporta nada, y a cambio la capa IRT del motor sigue disponible aunque
PyTorch o numpy no esten instalados. Solo la red neuronal necesita torch.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

# Escala de habilidad. Fuera de [-3, 3] la probabilidad de acierto ya esta
# pegada a 0 o a 1 y la rejilla no aportaria nada.
THETA_MIN = -3.0
THETA_MAX = 3.0
PUNTOS_REJILLA = 61

# Los cinco niveles editoriales del banco se reparten por la escala de
# dificultad: nivel 1 -> -1.8, nivel 3 -> 0.0, nivel 5 -> +1.8.
PASO_NIVEL = 0.9
NIVEL_CENTRAL = 3

#: Suelo de azar: todas las preguntas del banco tienen cuatro opciones. No es
#: un parametro que se estime, es un dato conocido del formato (ver cabecera).
ADIVINANZA = 0.25

#: Desviacion tipica de la habilidad ESTIMADA al terminar una evaluacion de
#: diez preguntas, y cortes de sus quintiles. Ambos medidos sobre 400
#: evaluaciones simuladas pasadas por el motor real. Son mas estrechos que el
#: N(0,1) de la habilidad verdadera porque el estimador encoge hacia la media,
#: que es lo correcto con pocas respuestas. La escala que ve el usuario se
#: construye sobre estos numeros y no sobre la teorica, para que el nivel y la
#: puntuacion se repartan de verdad en vez de apelotonarse en el centro.
ESCALA_ESTIMACION = 0.70
CORTES_NIVEL = (-0.53, -0.17, 0.23, 0.72)

REJILLA: list[float] = [
    THETA_MIN + (THETA_MAX - THETA_MIN) * i / (PUNTOS_REJILLA - 1)
    for i in range(PUNTOS_REJILLA)
]

# Prior N(0, 1) sobre la habilidad: sin ninguna respuesta, lo mas razonable es
# suponer que el alumno esta en la media de la poblacion.
_PRIOR: list[float] = [math.exp(-0.5 * t * t) for t in REJILLA]


@dataclass(frozen=True)
class ItemParams:
    """Parametros IRT de una pregunta."""

    a: float  # discriminacion
    b: float  # dificultad


@dataclass(frozen=True)
class Habilidad:
    """Estimacion de la habilidad del alumno."""

    theta: float
    #: Error estandar. Cuanto mas baja, mas seguro esta el motor de su
    #: estimacion; es lo que permite parar el test antes de tiempo.
    se: float

    @property
    def nivel(self) -> int:
        """Traduce `theta` al nivel 1-5 que entiende la interfaz."""
        return nivel_desde_theta(self.theta)


def parametros_por_defecto(level: int) -> ItemParams:
    """Parametros de partida de un item a partir de su nivel editorial.

    Se usan mientras el item no tenga calibracion propia: un item recien
    generado por la IA, o un banco todavia sin calibrar.
    """
    return ItemParams(a=1.0, b=(level - NIVEL_CENTRAL) * PASO_NIVEL)


def nivel_desde_theta(theta: float) -> int:
    """Nivel 1-5 del alumno: en que quinto de la plantilla cae.

    Es una escala NORMATIVA, no una traduccion directa de `theta`. El motivo es
    practico: la estimacion por EAP encoge hacia la media, asi que tras diez
    preguntas las habilidades estimadas no se reparten como N(0,1) sino con una
    desviacion de 0.70 (medido sobre 400 evaluaciones simuladas). Con el mapeo
    ingenuo `round(theta / 0.9) + 3`, practicamente todo el mundo caia en los
    niveles 3 y 4 y el indicador de la interfaz no se movia nunca.

    Los cortes son los quintiles observados de esa distribucion, de modo que
    "nivel 5" significa lo que uno espera que signifique: estar en el 20% mejor.
    """
    for nivel, corte in enumerate(CORTES_NIVEL, start=1):
        if theta <= corte:
            return nivel
    return 5


def _sigmoide(z: float) -> float:
    # Se acota el exponente para no desbordar con habilidades extremas.
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-min(z, 40.0)))
    e = math.exp(max(z, -40.0))
    return e / (1.0 + e)


def probabilidad(theta: float, item: ItemParams) -> float:
    """P(acertar el item | habilidad theta)."""
    return ADIVINANZA + (1.0 - ADIVINANZA) * _sigmoide(item.a * (theta - item.b))


def informacion(theta: float, item: ItemParams) -> float:
    """Informacion de Fisher que aporta el item a esa habilidad.

        I(theta) = a^2 * (Q / P) * ((P - c) / (1 - c))^2

    Es maxima cuando la pregunta esta cerca del nivel del alumno: una que va a
    acertar seguro, o fallar seguro, no dice nada nuevo sobre el. Este es el
    criterio que hace que un CAT necesite muchas menos preguntas que un test
    fijo para situar a alguien con la misma precision.

    Con adivinanza el maximo no cae exactamente en P = 0.5 sino algo por
    encima, porque parte de los aciertos no aportan informacion: pueden venir
    de acertar a ciegas. Con c = 0 la formula colapsa en a^2 * P * (1 - P).
    """
    p = probabilidad(theta, item)
    q = 1.0 - p
    if p <= 0.0 or q <= 0.0:
        return 0.0
    return (item.a**2) * (q / p) * (((p - ADIVINANZA) / (1.0 - ADIVINANZA)) ** 2)


def estimar_habilidad(respuestas: list[tuple[ItemParams, bool]]) -> Habilidad:
    """Estima la habilidad por EAP (media a posteriori) sobre la rejilla.

    Se usa EAP y no maxima verosimilitud con Newton-Raphson porque en un test
    de 8-10 preguntas es habitual que el alumno acierte todas o falle todas, y
    en ese caso la maxima verosimilitud se va a infinito. El prior mantiene la
    estimacion en un rango sensato y ademas da gratis el error estandar.
    """
    if not respuestas:
        return Habilidad(theta=0.0, se=1.0)

    posterior: list[float] = list(_PRIOR)
    for i, theta in enumerate(REJILLA):
        for item, acierto in respuestas:
            p = probabilidad(theta, item)
            posterior[i] *= p if acierto else (1.0 - p)

    masa = sum(posterior)
    if masa <= 0.0:
        # Puede pasar por perdida de precision con patrones muy extremos.
        return Habilidad(theta=0.0, se=1.0)

    media = sum(t * w for t, w in zip(REJILLA, posterior)) / masa
    varianza = sum(((t - media) ** 2) * w for t, w in zip(REJILLA, posterior)) / masa
    return Habilidad(theta=media, se=math.sqrt(max(varianza, 0.0)))


def puntuacion_desde_theta(theta: float) -> int:
    """Puntuacion 0-100 que se muestra al alumno: su percentil en la plantilla.

    NO es el porcentaje de aciertos, y esa diferencia es la clave de un test
    adaptativo: el motor busca a proposito preguntas que el alumno tenga
    aproximadamente la mitad de posibilidades de acertar, asi que el porcentaje
    de aciertos tiende a 50 para todo el mundo por construccion. Acertar 5 de
    10 preguntas dificilisimas y 5 de 10 faciles daria el mismo numero, cuando
    son resultados opuestos.

    Se devuelve el percentil, calculado con la normal de la habilidad estimada.
    Un 70 significa "por encima del 70% de la plantilla", que es informacion
    accionable para el DPO, y ademas usa todo el rango 0-100 en vez del tramo
    central estrecho que daba el mapeo lineal anterior.
    """
    z = theta / ESCALA_ESTIMACION
    percentil = 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))
    return max(0, min(100, round(percentil * 100)))
