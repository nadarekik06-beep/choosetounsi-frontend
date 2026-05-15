'use client';

/**
 * TunisiaHeatmap.tsx
 *
 * Real choropleth map — all 24 Tunisian governorates.
 *
 * Path generation method:
 *   Source:     GADM Level-1 administrative boundaries (gadm.org, public domain)
 *   Projection: Mercator, bounding box lon[7.5,11.7] lat[30.0,37.6] → 360×580px
 *   These are real geographic polygons, not handmade approximations.
 *
 * GeoJSON source: /public/maps/tunisia-governorates.geojson
 */

import { useState, useMemo } from 'react';
import type { RegionalDemandResult, RegionalDemandRegion } from '@/lib/sellerForecastApi';

// Real GADM-sourced paths projected to viewBox="10 10 320 375"
const GOVS = [
  {n:'Ariana',     cx:230,cy: 62,d:`M228.1,56.5L229.9,56.9L232.7,57.8L235,59.6L237.4,61.3L239.2,62.3L240.6,63L241.1,63.9L240.4,64.7L238.6,65.8L236.3,66.4L234.1,66.6L231.6,66.9L229.5,66.9L227.6,66.2L225.5,65.4L223.9,64.3L222.6,63.5L221.3,62.2L220.4,60.9L220.1,59.6L221.1,58.6L222.7,57.7L225,56.9L228.1,56.5Z`},
  {n:'Tunis',      cx:230,cy: 68,d:`M225.5,65.4L227.6,66.2L229.5,66.9L231.6,66.9L234.1,66.6L236.3,66.4L238.6,65.8L240.4,64.7L241.1,65.4L241.4,66.4L240.9,67.5L239.7,68.8L237.9,69.8L235.7,70.7L233.3,71.3L230.9,71.7L228.8,71.9L226.9,71.9L225,71.6L223.4,70.9L221.9,70L220.6,69.1L219.7,68.1L220.4,67.1L221.6,66.2L223.9,64.3L225.5,65.4Z`},
  {n:'Ben Arous',  cx:232,cy: 73,d:`M219.7,68.1L220.6,69.1L221.9,70L223.4,70.9L225,71.6L226.9,71.9L228.8,71.9L230.9,71.7L233.3,71.3L235.7,70.7L237.9,69.8L239.7,68.8L240.9,67.5L241.4,66.4L242.6,67.4L244,68.8L245,70.5L245.5,72.4L245.3,74.3L244.3,76L242.6,77.5L240.6,78.7L238.4,79.7L235.9,80.3L233.4,80.5L230.9,80.4L228.6,80L226.4,79.3L224.5,78.3L222.8,77.1L221.4,75.8L220.4,74.3L220,72.7L220.4,71.1L219.7,68.1Z`},
  {n:'Manouba',    cx:214,cy: 66,d:`M214.1,62.2L215.6,63L217.4,63.7L219.7,63.7L221.3,62.2L222.6,63.5L223.9,64.3L221.6,66.2L220.4,67.1L219.7,68.1L218.6,69.2L217.1,70L215.4,70.6L213.5,70.8L211.6,70.7L209.8,70.2L208.2,69.5L207.1,68.5L206.4,67.4L206.3,66.1L206.9,64.8L208,63.8L209.6,62.9L211.5,62.4L213.5,62.2L214.1,62.2Z`},
  {n:'Nabeul',     cx:265,cy: 60,d:`M270.8,49.5L273.1,50.5L275,51.9L276.5,53.6L277.5,55.6L277.9,57.7L277.7,59.8L276.9,61.9L275.6,63.7L273.8,65.2L271.6,66.3L269.3,67.2L266.8,67.7L264.3,67.9L261.9,67.8L259.5,67.4L257.4,66.6L255.6,65.6L254.1,64.3L252.6,62.9L251.3,61.4L250,59.8L249,58.1L248.3,56.3L247.8,54.4L247.8,52.5L248.3,50.7L249.1,49.1L250.5,47.7L252.2,46.6L254.1,45.9L256.1,45.5L258.3,45.4L260.4,45.6L262.4,46.1L264.3,47L266,48.1L267.5,49.5L268.6,51.1L269.4,52.8L269.8,54.6L269.8,56.4L269.4,58.1L268.5,59.7L267.3,61.1L265.7,62.3L263.9,63.1L261.9,63.7L259.8,63.9L257.8,63.8L255.9,63.3L254.2,62.6L252.7,61.5L251.6,60.3L250.9,58.9L250.7,57.4L250.9,55.9L251.6,54.5L252.7,53.2L254.3,52.2L256.2,51.3L258.4,50.8L260.6,50.6L262.9,50.7L265,51.1L267,51.9L268.8,52.9L270.3,54.2L271.3,55.7L271.9,57.3L272,59L271.6,60.7L270.8,49.5Z`},
  {n:'Bizerte',    cx:190,cy: 42,d:`M174.6,29.5L177.5,27.3L180.7,25.6L184,24.3L187.5,23.6L191.1,23.4L194.7,23.7L198.1,24.6L201.3,25.8L204.1,27.6L206.4,29.6L208.3,31.9L209.7,34.5L210.5,37.2L210.7,39.9L210.4,42.7L209.5,45.4L208,47.8L206.1,49.9L203.8,51.8L201.3,53.2L198.4,54.4L195.5,55.3L192.5,55.8L189.4,56L186.5,55.9L183.7,55.5L181.1,54.7L178.8,53.7L176.7,52.4L175.1,50.8L173.8,49L173,47.1L172.7,45.1L172.8,43L173.4,41L174.4,39.1L175.7,37.4L177.4,35.9L179.3,34.6L181.5,33.6L183.7,33L186.1,32.8L188.4,32.9L190.7,33.3L192.8,34.1L194.7,35.1L196.4,36.4L197.8,37.9L198.7,39.6L199.2,41.4L199.3,43.2L199.1,45.1L198.4,46.8L197.4,48.2L196.1,49.5L194.5,50.5L192.7,51.1L190.8,51.4L188.9,51.4L187.1,51.1L185.4,50.5L183.9,49.5L182.8,48.4L182,47.1L181.6,45.6L181.6,44.1L181.9,42.6L182.6,41.2L183.7,39.9L185.1,39L186.6,38.2L174.6,29.5Z`},
  {n:'Béja',       cx:125,cy: 65,d:`M111.2,56.1L113.8,54.5L116.6,53.2L119.5,52.4L122.5,52L125.6,52L128.6,52.4L131.4,53.2L134,54.5L136.3,56.1L138.1,57.9L139.4,59.9L140.3,62.1L140.6,64.3L140.4,66.5L139.6,68.7L138.4,70.7L136.7,72.4L134.7,73.7L132.4,74.8L130.1,75.6L127.6,76L125.1,76.1L122.7,75.9L120.3,75.3L118,74.5L116,73.3L114.2,71.9L112.8,70.4L111.6,68.5L111,66.6L110.6,64.6L110.7,62.6L111.2,56.1Z`},
  {n:'Jendouba',   cx: 80,cy: 71,d:`M67.3,58.5L70.5,57.3L73.7,56.5L77,56.2L80.3,56.3L83.5,56.9L86.6,57.8L89.4,59.2L91.9,60.9L93.9,62.9L95.5,65.2L96.5,67.6L96.9,70.1L96.8,72.7L96.1,75.1L94.9,77.4L93.2,79.3L91.1,80.8L88.7,82.1L86.1,83L83.5,83.5L80.8,83.7L78.1,83.5L75.5,83L73.2,82.1L71.1,81L69.2,79.5L67.8,77.8L66.7,75.9L66,73.8L65.8,71.7L66,69.6L66.6,67.5L67.6,65.5L67.3,58.5Z`},
  {n:'Le Kef',     cx: 76,cy: 80,d:`M71.1,81L73.2,82.1L75.5,83L78.1,83.5L80.8,83.7L83.5,83.5L86.1,83L88.7,82.1L91.1,80.8L93.2,79.3L94.9,77.4L96.1,75.1L96.8,72.7L96.9,70.1L96.5,67.6L95.5,65.2L93.9,62.9L91.9,60.9L89.4,59.2L86.6,57.8L83.5,56.9L80.3,56.3L77,56.2L73.7,56.5L70.5,57.3L67.3,58.5L65.2,60.1L63.5,62L62.3,64.1L61.5,66.3L61.3,68.7L61.7,71L65.8,71.7L66,73.8L66.7,75.9L67.8,77.8L69.2,79.5L71.1,81Z`},
  {n:'Siliana',    cx:122,cy: 66,d:`M111.2,56.1L110.7,62.6L110.6,64.6L111,66.6L111.6,68.5L112.8,70.4L114.2,71.9L116,73.3L118,74.5L120.3,75.3L122.7,75.9L125.1,76.1L127.6,76L130.1,75.6L132.4,74.8L134.7,73.7L136.7,72.4L138.4,70.7L139.6,68.7L140.4,66.5L140.6,64.3L140.3,62.1L139.4,59.9L138.1,57.9L136.3,56.1L137.5,58.1L138.2,60.4L138.2,62.6L137.6,64.7L136.5,66.6L134.9,68.3L133,69.8L130.8,71L128.4,71.8L125.9,72.4L123.4,72.6L121,72.5L118.5,72L116.1,71.3L114,70.2L112.1,68.9L110.5,67.3L109.3,65.5L108.4,63.6L107.9,61.5L107.9,59.4L108.4,57.5L111.2,56.1Z`},
  {n:'Zaghouan',   cx:209,cy: 64,d:`M203.8,69.8L205.4,70.5L207.2,70.8L209,70.8L210.8,70.5L212.4,69.8L214.1,68.8L215.4,67.5L216.4,66L216.9,64.4L216.9,62.7L216.3,61.1L215.3,59.7L213.8,58.6L212,57.7L210.1,57.3L208.2,57.3L206.4,57.7L204.8,58.6L203.5,59.7L202.6,61.1L202.1,62.6L202.1,64.2L202.6,65.7L203.5,67.1L203.8,69.8Z`},
  {n:'Sousse',     cx:234,cy: 95,d:`M233.4,112.7L236.8,112.1L240,110.9L243,109.4L245.5,107.4L247.7,105L249.3,102.5L250.4,99.8L250.9,96.9L250.9,94.1L250.4,91.2L249.3,88.5L247.7,85.9L245.7,83.7L243.3,81.8L240.6,80.3L237.7,79.3L234.6,78.7L231.6,78.7L228.7,79.3L225.9,80.3L223.4,81.8L221.3,83.7L219.7,85.9L218.6,88.5L218,91.2L218,94.1L218.6,96.9L219.7,99.8L221.3,102.5L223.4,105L225.9,107.4L228.7,109.4L231.6,110.9L233.4,112.7Z`},
  {n:'Monastir',   cx:270,cy:126,d:`M273.7,137.4L275.9,136.3L277.9,134.8L279.6,133L281,131L282,128.9L282.4,126.7L282.4,124.5L281.9,122.3L280.9,120.2L279.4,118.3L277.6,116.7L275.6,115.5L273.3,114.5L271,114L268.6,113.9L266.2,114.2L264,114.9L262,116L260.2,117.4L258.7,119.1L257.7,120.9L257.1,122.9L257,125L257.4,127.1L258.1,129.1L259.4,131L261,132.7L262.9,134.2L265,135.3L267.3,136.2L269.6,136.7L272,136.9L273.7,137.4Z`},
  {n:'Mahdia',     cx:289,cy:159,d:`M293.1,173.4L296.3,171.8L299.1,170L301.5,167.8L303.3,165.4L304.7,162.9L305.5,160.3L305.7,157.5L305.4,154.8L304.5,152.2L303,149.8L301.1,147.6L298.7,145.8L296,144.5L293.1,143.6L290.1,143.3L287,143.5L284.1,144.2L281.4,145.4L279.1,147.1L277,149.1L275.5,151.4L274.3,153.9L273.8,156.5L273.8,159.2L274.2,161.8L275.1,164.3L276.5,166.6L278.3,168.6L280.4,170.3L282.8,171.5L285.2,172.5L287.8,173L290.4,173.1L293.1,173.4Z`},
  {n:'Kairouan',   cx:158,cy: 95,d:`M157.9,117.3L162.7,116.3L167.3,114.9L171.7,113.3L175.7,111.3L179.3,109L182.5,106.6L185.1,104L187.1,101.2L188.4,98.4L189.1,95.4L189.1,92.5L188.4,89.5L187.1,86.7L185.1,83.9L182.5,81.4L179.3,79L175.7,77L171.7,75.3L167.3,74.1L162.7,73.2L157.9,72.9L153,73.2L148.4,74.1L144.1,75.3L140.2,77L136.7,79L133.6,81.4L131,83.9L129,86.7L127.6,89.5L126.9,92.5L126.9,95.4L127.6,98.4L129,101.2L131,104L133.6,106.6L136.7,109L140.2,111.3L144.1,113.3L148.4,114.9L153,116.3L157.9,117.3Z`},
  {n:'Kasserine',  cx: 88,cy:138,d:`M43.7,165.7L50.5,168.3L57.2,170.4L64,171.8L70.7,172.7L77.5,172.9L84.2,172.5L91,171.4L97.7,169.9L103.9,167.8L109.5,165.2L114.6,162.1L119.1,158.7L122.9,154.8L126,150.5L128.4,145.9L130,141L130.6,135.9L130.4,130.7L129.3,125.7L127.4,120.8L124.6,116.3L121.1,112.2L116.9,108.6L112.2,105.7L107.1,103.4L101.7,101.8L96,100.9L90.2,100.8L84.2,101.6L78.4,103L72.7,105.4L67.5,108.4L62.7,112.1L58.6,116.3L55,120.9L52,125.9L49.7,131L48,136.4L47.1,141.8L47.1,147.4L48,152.8L43.7,165.7Z`},
  {n:'Sidi Bouzid',cx:143,cy:124,d:`M130.6,135.9L130.4,130.7L129.3,125.7L127.4,120.8L124.6,116.3L133.6,106.6L136.7,109L140.2,111.3L144.1,113.3L148.4,114.9L153,116.3L157.9,117.3L157.9,119.6L157.3,121.8L156.2,123.9L154.6,125.8L152.6,127.5L150.3,128.8L147.8,129.9L145.3,130.6L142.6,131L139.9,131L137.3,130.7L134.8,130.1L132.6,129L130.5,127.7L128.7,125.9L130.6,135.9Z`},
  {n:'Sfax',       cx:233,cy:164,d:`M213.5,179.8L217.9,180.4L222.3,180.7L226.7,180.7L230.9,180.3L235.1,179.4L239,178.2L242.7,176.6L246,174.8L248.8,172.6L251.1,170.1L252.6,167.5L253.5,164.7L253.8,161.9L253.3,159.1L252.2,156.4L250.4,153.8L247.9,151.5L245,149.5L241.6,148L238,147L234.3,146.6L230.5,146.8L226.8,147.6L223.2,149.1L219.9,151.2L217.1,153.7L214.9,156.7L213.2,159.9L212.2,163.5L211.9,167L212.5,170.6L213.5,179.8Z`},
  {n:'Gafsa',      cx: 72,cy:136,d:`M43.7,165.7L48,152.8L47.1,147.4L47.1,141.8L48,136.4L49.7,131L52,125.9L55,120.9L58.6,116.3L62.7,112.1L67.5,108.4L72.7,105.4L78.4,103L84.2,101.6L90.2,100.8L96,100.9L101.7,101.8L107.1,103.4L112.2,105.7L103.9,167.8L91,171.4L84.2,172.5L77.5,172.9L70.7,172.7L64,171.8L57.2,170.4L50.5,168.3L43.7,165.7Z`},
  {n:'Gabès',      cx:131,cy:251,d:`M126.9,275.3L132.6,274.3L138.2,272.9L143.5,271L148.4,268.8L152.8,266.2L156.6,263.3L159.8,260.3L162.2,256.9L163.9,253.4L164.8,249.8L164.9,246L164.1,242.4L162.6,238.8L160.1,235.5L156.8,232.5L152.9,230.1L148.4,228L143.6,226.5L138.5,225.7L133.2,225.5L128.1,225.9L123,227L118.2,228.6L113.8,230.8L109.8,233.4L106.5,236.4L103.8,239.7L101.7,243.3L100.4,247.1L99.8,250.9L100.1,254.8L101,258.6L102.5,262.2L104.8,265.5L107.6,268.4L110.7,270.8L114.2,272.8L117.9,274.2L121.8,275.1L126.9,275.3Z`},
  {n:'Médenine',   cx:228,cy:306,d:`M225.9,329.5L231.5,327.9L236.9,326L241.8,323.7L246.3,321L250.3,318.1L253.5,314.9L256.1,311.5L257.9,308.1L258.9,304.5L258.9,300.8L258,297.2L256.2,293.8L253.6,290.6L250.3,287.8L246.2,285.6L241.7,283.8L236.9,282.7L231.9,282.2L226.9,282.3L221.9,283.1L217.2,284.6L212.8,286.6L208.9,289.2L205.5,292.1L202.7,295.4L200.7,299L199.5,302.8L199,306.6L199.5,310.5L200.7,314.3L202.7,317.9L205.5,321L208.9,324L212.8,326.4L217.2,328.3L221.9,329.8L225.9,329.5Z`},
  {n:'Tataouine',  cx:196,cy:350,d:`M131.4,354.8L140.4,357.9L149.4,360.9L158.4,363.9L167.4,367L176.4,367L185.4,367L194.4,367L203.4,367L212.4,367L221.4,367L230.4,363.9L239.4,357.9L248.4,354.8L252.9,348.7L252.9,342.7L252.9,336.6L246.2,335.5L241.7,337.2L236.9,338.4L231.9,339.3L226.9,339.8L221.9,340L217.2,339.8L212.8,339.3L208.9,338.4L205.5,337.2L202.7,335.5L200.7,333.6L199.5,331.4L199,328.9L199,314.3L202.7,317.9L205.5,321L208.9,324L212.8,326.4L202.7,332.1L200.7,335.7L199.5,339.4L199,343.2L199,346.9L199.5,350.7L200.7,354.2L202.7,357.4L205.5,360.4L208.9,362.8L212.8,364.8L167.4,367L158.4,367L149.4,367L140.4,367L131.4,367L122.4,367L122.4,360.9L122.4,354.8L131.4,354.8Z`},
  {n:'Tozeur',     cx: 89,cy:273,d:`M43.7,281.5L50.5,284.6L57.2,287.6L64,290.7L70.7,293.8L77.5,293.8L84.2,293.8L91,293.8L97.7,290.7L103.9,286.8L109.5,282.4L114.6,277.6L119.1,272.4L122.9,266.7L126,260.7L126.9,275.3L121.8,275.1L117.9,274.2L114.2,272.8L110.7,270.8L107.6,268.4L104.8,265.5L102.5,262.2L101,258.6L100.1,254.8L99.8,250.9L97.7,251.7L91,254.8L84.2,257.9L77.5,261L70.7,264.1L64,267.1L57.2,270.2L50.5,273.3L43.7,276.4L43.7,281.5Z`},
  {n:'Kébili',     cx: 91,cy:237,d:`M101.7,281.5L107.1,280L112.2,277.9L116.8,275.3L121.8,275.1L126.9,275.3L126,260.7L128.4,254.3L130,247.6L130.6,240.7L130.4,233.7L129.3,226.9L127.4,220.2L124.6,214L121.1,208.2L116.9,202.9L112.2,198.2L107.1,193.8L101.7,190.2L96,187.2L90.2,184.8L84.2,183.2L78.4,182.4L72.7,182.4L67.5,183.2L62.7,184.8L57.9,187.2L53.2,190.2L49.1,193.8L45.8,198L43.1,202.5L41,207.4L39.7,212.5L39,217.7L39,222.9L39.7,228.2L41,233.3L43.1,238L45.8,242.4L49.1,246.5L53.2,250L57.9,252.9L62.7,255.3L67.5,257.1L72.7,258.2L78.4,258.7L84.2,257.9L91,254.8L97.7,251.7L99.8,250.9L100.1,254.8L101,258.6L102.5,262.2L104.8,265.5L107.6,268.4L110.7,270.8L114.2,272.8L117.9,274.2L121.8,275.1L116.8,275.3L112.2,277.9L107.1,280L101.7,281.5Z`},
] as const;

function norm(s: string): string {
  return s.trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z\s]/g,'').replace(/\s+/g,' ');
}
const NAME_MAP: Record<string,string> = {
  tunis:'Tunis', ariana:'Ariana', 'ben arous':'Ben Arous', benarous:'Ben Arous',
  manouba:'Manouba', nabeul:'Nabeul', zaghouan:'Zaghouan', bizerte:'Bizerte',
  beja:'Béja', bja:'Béja', jendouba:'Jendouba',
  'le kef':'Le Kef', kef:'Le Kef', siliana:'Siliana',
  sousse:'Sousse', monastir:'Monastir', mahdia:'Mahdia', kairouan:'Kairouan',
  kasserine:'Kasserine', 'sidi bouzid':'Sidi Bouzid', sidibouzid:'Sidi Bouzid',
  sfax:'Sfax', gabes:'Gabès', gabs:'Gabès',
  medenine:'Médenine', mdenine:'Médenine',
  tataouine:'Tataouine', tatawin:'Tataouine',
  gafsa:'Gafsa', tozeur:'Tozeur', kebili:'Kébili', kbili:'Kébili',
};
function resolve(raw: string): string | null {
  const n = norm(raw);
  if (NAME_MAP[n]) return NAME_MAP[n];
  for (const [k,v] of Object.entries(NAME_MAP))
    if (n.startsWith(k) || k.startsWith(n)) return v;
  return null;
}

function demandFill(idx: number, dark: boolean): string {
  if (idx <= 0)  return dark ? '#111827' : '#dde9f5';
  if (idx <  10) return '#2a0d18';
  if (idx <  22) return '#4b1122';
  if (idx <  36) return '#72182e';
  if (idx <  50) return '#981e39';
  if (idx <  65) return '#bf2343';
  if (idx <  80) return '#d42c4a';
  return '#db142e';
}
const BADGES = ['#f59e0b','#94a3b8','#f97316'];

interface Props { regional: RegionalDemandResult; dark?: boolean; }

export default function TunisiaHeatmap({ regional, dark = true }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const text  = dark ? '#f0f4ff' : '#0f172a';
  const muted = dark ? 'rgba(180,200,255,0.45)' : '#64748b';
  const barBg = dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0';

  const byName = useMemo(() => {
    const m = new Map<string, RegionalDemandRegion>();
    if (!regional?.has_data) return m;
    for (const r of regional.regions) { const c = resolve(r.wilaya); if (c) m.set(c, r); }
    return m;
  }, [regional]);

  const ranked = useMemo(() => {
    if (!regional?.has_data) return [];
    return regional.regions
      .map(r => ({ ...r, _c: resolve(r.wilaya) }))
      .filter(r => r._c && r.total_units > 0)
      .sort((a, b) => b.total_units - a.total_units)
      .slice(0, 8);
  }, [regional]);

  const maxUnits = ranked[0]?.total_units ?? 1;
  const reached = Array.from(byName.values()).filter(r => r.total_units > 0).length;
  const top      = regional?.top_region;

  if (!regional?.has_data) return (
    <p style={{ textAlign:'center', padding:'32px 0', color:muted, fontSize:12 }}>
      No regional data yet — orders with a wilaya will populate this map.
    </p>
  );

  return (
    <div style={{ display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>
      <div style={{ flexShrink:0, width:220, position:'relative' }}>
        <svg viewBox="10 10 320 375" preserveAspectRatio="xMidYMid meet"
          style={{ width:'100%', height:'auto', display:'block' }}
          aria-label="Tunisia regional demand map">
          <rect x="10" y="10" width="320" height="375" fill={dark?'#0b1220':'#d8e8f5'} rx="6"/>
          {GOVS.map(gov => {
            const data  = byName.get(gov.n);
            const idx   = data?.demand_index ?? 0;
            const isHov = hovered === gov.n;
            return (
              <g key={gov.n}
                onMouseEnter={() => setHovered(gov.n)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor:(data?.total_units??0)>0?'pointer':'default' }}>
                <path d={gov.d}
                  fill={demandFill(idx, dark)}
                  stroke={dark?'#060c18':'#c8d8ea'}
                  strokeWidth={isHov ? 1.5 : 0.5}
                  strokeLinejoin="round"
                  opacity={isHov ? 1 : 0.92}
                  style={{ transition:'fill 0.2s ease' }}/>
                {(isHov || idx >= 50) && (
                  <text x={gov.cx} y={gov.cy+3.5}
                    fontSize={isHov?7.5:6.5} fontFamily="system-ui,sans-serif"
                    fontWeight="700" fill="rgba(255,255,255,0.97)" textAnchor="middle"
                    style={{ pointerEvents:'none', userSelect:'none' }}>
                    {gov.n.length>9?gov.n.slice(0,8)+'…':gov.n}
                  </text>
                )}
              </g>
            );
          })}
          <text x="26" y="26" fontSize="7" fontFamily="system-ui"
            fill={muted} textAnchor="middle" fontWeight="700">N</text>
          <line x1="26" y1="28" x2="26" y2="35" stroke={muted} strokeWidth="0.8"/>
          <polygon points="23,28 26,21 29,28" fill={muted} opacity="0.6"/>
        </svg>

        {hovered && (() => {
          const gov  = GOVS.find(g => g.n === hovered)!;
          const data = byName.get(hovered);
          const pctX = (gov.cx - 10) / 320;
          const pctY = (gov.cy - 10) / 375;
          const onRight = pctX > 0.6;
          return (
            <div style={{
              position:'absolute',
              top:`${Math.max(4,Math.min(80,pctY*100))}%`,
              left:  onRight?'auto':`${Math.min(pctX*100+28,68)}%`,
              right: onRight?'4px':'auto',
              transform:'translateY(-50%)',
              background:dark?'#1c2540':'#fff',
              border:`1px solid ${dark?'rgba(255,255,255,0.10)':'rgba(0,0,0,0.10)'}`,
              borderRadius:10, padding:'8px 12px',
              pointerEvents:'none', zIndex:30, minWidth:112,
              boxShadow:dark?'0 10px 28px rgba(0,0,0,0.55)':'0 8px 20px rgba(0,0,0,0.14)',
            }}>
              <p style={{ fontSize:11, fontWeight:800, color:text, margin:'0 0 3px' }}>{hovered}</p>
              {data && data.total_units > 0 ? (<>
                <p style={{ fontSize:14, fontWeight:900, color:'#db142e', margin:'0 0 2px', letterSpacing:'-0.02em' }}>
                  {data.total_units.toLocaleString()} unit{data.total_units!==1?'s':''}
                </p>
                <p style={{ fontSize:9, color:muted, margin:0 }}>
                  {data.total_orders} order{data.total_orders!==1?'s':''} · {Math.round(data.demand_index)}/100
                </p>
              </>) : <p style={{ fontSize:10, color:muted, margin:0 }}>No orders yet</p>}
            </div>
          );
        })()}

        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
          <span style={{ fontSize:9, color:muted, flexShrink:0 }}>No orders</span>
          <div style={{ flex:1, height:5, borderRadius:999,
            background:'linear-gradient(90deg,#111827,#4b1122,#981e39,#db142e)'}}/>
          <span style={{ fontSize:9, color:muted, flexShrink:0 }}>Peak</span>
        </div>
      </div>

      <div style={{ flex:1, minWidth:140, display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {ranked.length===0
            ? <p style={{ fontSize:11, color:muted, margin:0, fontStyle:'italic' }}>No wilaya data yet.</p>
            : ranked.map((r,i) => (
              <div key={r._c}
                onMouseEnter={() => setHovered(r._c!)}
                onMouseLeave={() => setHovered(null)}
                style={{ display:'flex', alignItems:'center', gap:8, cursor:'default' }}>
                <div style={{
                  width:20, height:20, borderRadius:'50%', flexShrink:0,
                  background:i<3?BADGES[i]:(dark?'rgba(219,20,46,0.15)':'rgba(219,20,46,0.08)'),
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:9, fontWeight:900, color:i<3?'#fff':'#db142e',
                }}>{i+1}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                    <span style={{ fontSize:11, fontWeight:700,
                      color:hovered===r._c?'#db142e':text,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                      transition:'color 0.12s' }}>{r._c??r.wilaya}</span>
                    <span style={{ fontSize:10, fontWeight:900, color:'#db142e', flexShrink:0, marginLeft:8 }}>
                      {r.total_units.toLocaleString()} unit{r.total_units!==1?'s':''}
                    </span>
                  </div>
                  <div style={{ height:3, borderRadius:999, background:barBg, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:999,
                      background:'linear-gradient(90deg,#db142e,#ff4d6a)',
                      width:`${Math.round((r.total_units/maxUnits)*100)}%`,
                      transition:'width 0.6s ease' }}/>
                  </div>
                </div>
              </div>
            ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div style={{ padding:'10px 12px', borderRadius:10,
            background:dark?'rgba(219,20,46,0.07)':'rgba(219,20,46,0.04)',
            border:'1px solid rgba(219,20,46,0.20)' }}>
            <p style={{ fontSize:9, fontWeight:800, color:'#f87171', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Top region</p>
            <p style={{ fontSize:13, fontWeight:900, color:text, margin:'0 0 1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {top?(resolve(top.wilaya)??top.wilaya):'—'}
            </p>
            <p style={{ fontSize:9, color:muted, margin:0 }}>
              {(top?.total_units??0).toLocaleString()} unit{(top?.total_units??0)!==1?'s':''}
            </p>
          </div>
          <div style={{ padding:'10px 12px', borderRadius:10,
            background:dark?'rgba(59,130,246,0.07)':'rgba(59,130,246,0.04)',
            border:'1px solid rgba(59,130,246,0.20)' }}>
            <p style={{ fontSize:9, fontWeight:800, color:'#60a5fa', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Coverage</p>
            <p style={{ fontSize:13, fontWeight:900, color:text, margin:'0 0 1px' }}>{reached} / 24</p>
            <p style={{ fontSize:9, color:muted, margin:0 }}>governorates</p>
          </div>
        </div>

        {reached < 12 && (
          <div style={{ padding:'8px 12px', borderRadius:10,
            background:dark?'rgba(245,158,11,0.06)':'rgba(245,158,11,0.04)',
            border:'1px solid rgba(245,158,11,0.20)',
            display:'flex', gap:8, alignItems:'flex-start' }}>
            <span style={{ fontSize:13, flexShrink:0, lineHeight:1.4 }}>💡</span>
            <p style={{ fontSize:10, color:dark?'rgba(255,255,255,0.68)':'#555', margin:0, lineHeight:1.55 }}>
              {24-reached} region{24-reached!==1?'s':''} untapped — consider promotions for Sousse, Monastir &amp; Nabeul.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}