export const Polymer = PolymerClass

class PolymerClass extends Colors
{
	/**
	 * @method	Animate
	 * 
	 * Crea una animación de un elemento HTML
	 * 
	 * @param el Elemento HTML que queremos animar
	 * @param props Objeto con las porpiedades CSS que se quieren animar
	 * @param settings Configuración de la animación
	 * @param callback Función de calback
	 */
	static Animate( el: Element, props: object, settings?: propSettinsAnimate|Function, callback?: Function ) : void

	/**
	 * Conversión de colores a otros formatos, saber el formato de color de un string
	 * o su contraste
	 */
	static Colors: {
		/**
		 * @function type
		 * 
		 * Determina el formato del color que se le pasa al parámetro
		 * 
		 * @param color Color del que queremos saber el tipo
		 * @returns	{string} Tipo de color (HEX|RGB|RGBA|HSL|HSLA|TEXTO)
		 */
		type: ( color: string ) => string,

		/**
		 * @function toRGB
		 * 
		 * Convierte un color a formato RGB
		 * 
		 * @param color Color que queremos convertir a RGB
		 * @returns	{string} Color convertido en RGB
		 */
		toRGB: ( color: string ) => string,

		/**
		 * @function toRGBA
		 * 
		 * Convierte un color a formato RGBA
		 * 
		 * @param color Color que queremos convertir a RGBA,
		 * @param transparencia Transparencia que queremos que tenga
		 * @returns {string} Color convertido a RGBA
		 */
		toRGBA: ( color: string, transparencia?: number ) => string,

		/**
		 * @function toHSL
		 * 
		 * Convierte un color a formato HSL
		 * 
		 * @param color Color que queremos convertir a HSL
		 * @returns	{string} Color convertido en HSL
		 */
		toHSL: ( color: string ) => string,

		/**
		 * @function toHSLA
		 * 
		 * Convierte un color a formato HSLA
		 * 
		 * @param color Color que queremos convertir a HSLA,
		 * @param transparencia Transparencia que queremos que tenga
		 * @returns {string} Color convertido a HSLA
		 */
		toHSLA: ( color: string, transparencia?: number ) => string,

		/**
		 * @function toHEX
		 * 
		 * Convierte un color a formato HEXADECIMAL
		 * 
		 * @param color Color que queremos convertir a HEXADECIMAL
		 * @returns	{string} Color convertido en HEXADECIMAL
		 */
		toHEX: ( color: string ) => string,

		/**
		 * @function contrast
		 * 
		 * Devuelve el contraste de un color
		 * 
		 * @param color Color que queremos saber el contraste
		 * @returns	{string} Contraste del color (light|dark)
		 */
		contrast: ( color: string ) => string
	}

	/**
	 * Animación de aparición o desaparación de un elemento HTML
	 */
	static Fade: {
		/**
		 * @function in
		 * 
		 * Animación que hace aparecer un elemento HTML
		 * 
		 * @param el Elemento HTML que queremos aparecer
		 * @param settings Configuración de la animación
		 * @param callbakc Función de callback
		 */
		in: ( el: Element, settings?: settingsFade|Function, callback?: Function ) => void,
		
		/**
		 * @function out
		 * 
		 * Animación que hace desaparecer un elemento HTML
		 * 
		 * @param el Elemento HTML que queremos desaparecer
		 * @param settings Configuración de la animación
		 * @param callbakc Función de callback
		 */
		out: ( el: Element, settings?: settingsFade|Function, callback?: Function ) => void,
		
		/**
		 * @function toggle
		 * 
		 * Animación que hace aparecer o desaparecer un elemento HTML según su estado
		 * 
		 * @param el Elemento HTML que queremos animar
		 * @param settings Configuración de la animación
		 * @param callbakc Función de callback
		 */
		toggle: ( el: Element, settings?: settingsFade|Function, callback?: Function ) => void
	}

	/**
	 * Escucha elementos HTML a través de un selector aunque estos no se encuentren
	 * en la carga inicial del DOM
	 */
	static ListenDom : {
		/**
		 * @method on
		 * 
		 * Pone a la escucha los eventos sobre un elemento HTML a través de un selector
		 * aunque este no esté presente en la carga de la página. Sería similar a jQuery.on
		 * 
		 * @param event Evento que queremos escuchar (click,mouseover,submit...)
		 * @param selector Selector CSS del elemento HTML
		 * @param func Función que se realizará cuando se haga el evento
		 */
		on: ( event: string, selector: string, func: Function ) => void,

		/**
		 * @method off
		 * 
		 * Quita la escucha los eventos sobre un elemento HTML que previamente había 
		 * sido asignado por el método on.
		 * 
		 * @param event Evento que queremos dejar escuchar (click,mouseover,submit...)
		 * @param selector Selector CSS del elemento HTML
		 * @param func Función que se registró en el método on
		 */
		off: ( event: string, selector: string, func: Function ) => void
	}
	
	/**
	 * Efecto de paralaje sobre elementos HTML
	 */
	static Parallax: {
		init: ( el: Element, settings?: settingsParallax ) => void
	}

	/**
	 * Animación del scroll
	 */
	static scroll: {
		/**
		 * @function to
		 * 
		 * Anima el scroll a una altura determinada
		 * 
		 * @param height Altura a la que queremos animar el scroll
		 * @param duration Duración que queremos que tenga la animación, por defecto 500
		 * @param scrollable Elemento sobre el que queremos hacer scroll, por defecto window
		 */
		to: ( height: number, duration?: number, scrollable?: Element ) => void,

		/**
		 * @function toElement
		 * 
		 * Anima el scroll hacia un elemento HTML concreto
		 * 
		 * @param el Elemento hacia el que queremos llevar el scroll
		 * @param margin Margen superior que queremos dejar sobre el elemento
		 * @param duration Duración que queremos que tenga la animación, por defecto 500
		 * @param scrollable Elemento sobre el que queremos hacer scroll, por defecto window
		 */
		toElement: ( el: Element, margin?: number, duration?: number, scrollable?: Element ) => void,

		/**
		 * @function top
		 * 
		 * Anima el scrol a su tope superior
		 * 
		 * @param duration Duración de la animación
		 * @param scrollable Elemento sobre el que queremos hacer scroll, por defecto window
		 */
		top: ( duration: number, scrollable?: Element ) => void,

		/**
		 * @function bottom
		 * 
		 * Anima el scrol a su tope inferior
		 * 
		 * @param duration Duración de la animación
		 * @param scrollable Elemento sobre el que queremos hacer scroll, por defecto window
		 */
		bottom: ( duration: number, scrollable?: Element ) => void
	}

	/**
	 * Animación de cortina de un elemento HTML
	 */
	static Slide: {
		/**
		 * @function down
		 * 
		 * Hace aparecer un elemento con el efecto de bajada de persiana
		 * 
		 * @param el Elemento HTML que queremos aparecer
		 * @param settings Configuración de la animación
		 * @param callbakc Función de callback
		 */
		down: ( el: Element, settings?: settingsFade|Function, callback?: Function ) => void,
		
		/**
		 * @function out
		 * 
		 * Hace desaparecer un elemento con el efecto de subida de persiana
		 * 
		 * @param el Elemento HTML que queremos desaparecer
		 * @param settings Configuración de la animación
		 * @param callbakc Función de callback
		 */
		up: ( el: Element, settings?: settingsFade|Function, callback?: Function ) => void,
		
		/**
		 * @function toggle
		 * 
		 * Animación que hace aparecer o desaparecer un elemento HTML según su estado
		 * 
		 * @param el Elemento HTML que queremos animar
		 * @param settings Configuración de la animación
		 * @param callbakc Función de callback
		 */
		toggle: ( el: Element, settings?: settingsFade|Function, callback?: Function ) => void
	}

	/**
	 * Hace que un elemento se deslizce sobre su contenedor padre según baja o sube el scroll
	 */
	SliderElement: {
		/**
		 * @function init
		 * 
		 * Registra un elemento para que se deslice al hacer scroll sobre la ventana
		 * o algún elemento scrollable
		 * 
		 * @param el Elemento que queremos que se deslice a través de su padre
		 * @param settings Configuración {{headFixHeight:number,footerFixHeight:number,minWidth:number,marginStart:number}}
		 * @param scrollable Elemento scrollable que provovará la animación, por defecto Window.
		 */
		init: ( el: Element, settings?: settingsScrollElement, scrollable?: Element ) => void
	}

	/**
	 * Convierte un textarea en ajustable en altura según se va escribiendo en él
	 */
	TextareaAdjust: {
		/**
		 * @function init
		 * 
		 * Registra un textarea para que se anime al escribir sobre él
		 * 
		 * @param el Textarea que queremos que sea ajustable
		 * @param settings Configuración del textarea
		 */
		init: ( el: Element, settings?: settginsTextAreaAdjust ) => void
	}
}

class Colors {

}

interface propSettinsAnimate { 
	/** Velocidad de la animación */
	speed: number, 
	/** Efecto de la animación (ease, ease-in, cubic-bezier(n,n,n,n)) */
	effect: string, 
	/** Retardon en empezar la animación */
	delay: number
}

interface settingsFade {
	/** Velocidad de la animación */
	speed: number,
	/** Efecto de la animación (ease, ease-in, cubic-bezier(n,n,n,n)) */
	effect: string
}

interface settingsParallax {
	/** Propiedad que queremos animar (background|Element) */
	property: string,
	/** Dirección que queremos de la animación (down|up) */
	direction: string,
	/** Velocidad de la animación, un número de 1 a 20 */
	speed: number,
	/** Para las animación del fonco el color de fondo que queremos */
	bgColor: string
}

interface settingsScrollElement {
	/** Si hay una cabecera fija, el alto de ésta */
	headFixHeight: number,
	/** Si hay un pie de página fijo el alto de éste */
	footerFixHeight: number,
	/** El ancho mínimo para que el elemento se anime al hacer scroll */
	minWidth: number,
	/** Un marge superior que se dejará al animar el elemento, por defecto 20 */
	marginStart: number
}

interface settginsTextAreaAdjust {
	/** Alto máximo que queremos que se expanda el textarea */
	maxHeight: number
}